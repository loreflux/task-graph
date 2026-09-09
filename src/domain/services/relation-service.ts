/**
 * @module domain/services/relation-service
 * @description Manages dependency (DEPENDS_ON) edges in the task DAG.
 *
 * Responsibilities:
 * - Add/remove dependency edges with cycle detection
 * - Query dependencies and dependents for a given task
 * - Build adjacency lists for graph algorithm consumption
 *
 * The adjacency list format matches what the pure graph-algorithm functions
 * expect: `Map<nodeId, dependencyIds[]>` — i.e. `get(A) = [B, C]` means
 * "A depends on B and C".
 */

import { eq, and, or } from 'drizzle-orm';
import { db } from '@/db';
import { tasks, taskRelations, activityLogs } from '@/db/schema';
import type { TaskRelation } from '@/types';
import { createRelationSchema } from '@/domain/validators';
import { detectCycle } from '@/lib/graph-algorithms/cycle-detection';
import type { AdjacencyList } from '@/lib/graph-algorithms/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToRelation(row: typeof taskRelations.$inferSelect): TaskRelation {
  return {
    id: row.id,
    sourceTaskId: row.sourceTaskId,
    targetTaskId: row.targetTaskId,
    relationType: row.relationType as TaskRelation['relationType'],
    description: row.description,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const relationService = {
  /**
   * Add a dependency edge: sourceTask depends on targetTask.
   *
   * Before inserting, validates the input, checks both tasks exist,
   * builds the current adjacency list, and runs cycle detection to
   * ensure the graph remains a valid DAG.
   *
   * @param sourceTaskId - The task that gains a dependency.
   * @param targetTaskId - The task that must be completed first.
   * @param description - Optional description of the dependency.
   * @returns The newly created TaskRelation.
   * @throws {Error} If adding the edge would create a cycle.
   */
  async addDependency(
    sourceTaskId: string,
    targetTaskId: string,
    description?: string,
  ): Promise<TaskRelation> {
    const parsed = createRelationSchema.parse({
      sourceTaskId,
      targetTaskId,
      relationType: 'DEPENDS_ON',
      description,
    });

    return db.transaction(async (tx) => {
      // Verify both tasks exist and are not deleted
      const [source] = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, parsed.sourceTaskId), eq(tasks.isDeleted, false)));

      if (!source) {
        throw new Error(`Source task not found: ${parsed.sourceTaskId}`);
      }

      const [target] = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, parsed.targetTaskId), eq(tasks.isDeleted, false)));

      if (!target) {
        throw new Error(`Target task not found: ${parsed.targetTaskId}`);
      }

      // Check for duplicate
      const [existing] = await tx
        .select({ id: taskRelations.id })
        .from(taskRelations)
        .where(
          and(
            eq(taskRelations.sourceTaskId, parsed.sourceTaskId),
            eq(taskRelations.targetTaskId, parsed.targetTaskId),
          ),
        );

      if (existing) {
        throw new Error('This dependency already exists');
      }

      // Build the current adjacency list for cycle detection
      const adjacencyList = await buildAdjacencyListFromTx(tx);

      // Check if adding this edge would create a cycle
      const cycleResult = detectCycle(
        adjacencyList,
        parsed.sourceTaskId,
        parsed.targetTaskId,
      );

      if (cycleResult.hasCycle) {
        throw new Error(
          `Adding this dependency would create a cycle: ${cycleResult.cyclePath?.join(' → ')}`,
        );
      }

      // Insert the relation
      const [row] = await tx
        .insert(taskRelations)
        .values({
          sourceTaskId: parsed.sourceTaskId,
          targetTaskId: parsed.targetTaskId,
          relationType: parsed.relationType,
          description: parsed.description ?? null,
        })
        .returning();

      // Log the action
      await tx.insert(activityLogs).values({
        taskId: parsed.sourceTaskId,
        actionType: 'ADD_DEPENDENCY',
        beforeState: null,
        afterState: {
          sourceTaskId: parsed.sourceTaskId,
          targetTaskId: parsed.targetTaskId,
        },
      });

      return rowToRelation(row!);
    });
  },

  /**
   * Remove a dependency edge by relation ID.
   *
   * @param relationId - The UUID of the TaskRelation to remove.
   * @throws {Error} If the relation is not found.
   */
  async removeDependency(relationId: string): Promise<void> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(taskRelations)
        .where(eq(taskRelations.id, relationId));

      if (!existing) {
        throw new Error(`Relation not found: ${relationId}`);
      }

      await tx
        .delete(taskRelations)
        .where(eq(taskRelations.id, relationId));

      await tx.insert(activityLogs).values({
        taskId: existing.sourceTaskId,
        actionType: 'REMOVE_DEPENDENCY',
        beforeState: {
          sourceTaskId: existing.sourceTaskId,
          targetTaskId: existing.targetTaskId,
        },
        afterState: null,
      });
    });
  },

  /**
   * Get all dependencies of a task (tasks it depends ON).
   *
   * Returns relations where the given task is the **source**.
   *
   * @param taskId - The task whose dependencies to retrieve.
   * @returns Array of TaskRelation records.
   */
  async getDependencies(taskId: string): Promise<TaskRelation[]> {
    const rows = await db
      .select()
      .from(taskRelations)
      .where(eq(taskRelations.sourceTaskId, taskId));

    return rows.map(rowToRelation);
  },

  /**
   * Get all dependents of a task (tasks that depend ON it).
   *
   * Returns relations where the given task is the **target**.
   *
   * @param taskId - The task whose dependents to retrieve.
   * @returns Array of TaskRelation records.
   */
  async getDependents(taskId: string): Promise<TaskRelation[]> {
    const rows = await db
      .select()
      .from(taskRelations)
      .where(eq(taskRelations.targetTaskId, taskId));

    return rows.map(rowToRelation);
  },

  /**
   * Build the full adjacency list from the database.
   *
   * Optionally scoped to a single project. The resulting map uses the
   * format expected by graph algorithm functions:
   * `Map<taskId, dependencyIds[]>`.
   *
   * @param projectId - Optional project ID to scope the graph.
   * @returns An AdjacencyList suitable for cycle detection, topological sort, etc.
   */
  async buildAdjacencyList(projectId?: string): Promise<AdjacencyList> {
    return buildAdjacencyListFromDb(projectId);
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build adjacency list from a transaction context (for use inside tx).
 * Reads all non-deleted tasks and all relations.
 */
async function buildAdjacencyListFromTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<AdjacencyList> {
  const allTasks = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.isDeleted, false));

  const allRelations = await tx
    .select({
      sourceTaskId: taskRelations.sourceTaskId,
      targetTaskId: taskRelations.targetTaskId,
    })
    .from(taskRelations);

  const adjacencyList: AdjacencyList = new Map();

  // Initialize all task nodes
  for (const task of allTasks) {
    adjacencyList.set(task.id, []);
  }

  // Add edges
  for (const rel of allRelations) {
    const deps = adjacencyList.get(rel.sourceTaskId);
    if (deps) {
      deps.push(rel.targetTaskId);
    }
  }

  return adjacencyList;
}

/**
 * Build adjacency list from the main db connection, optionally scoped by project.
 */
async function buildAdjacencyListFromDb(projectId?: string): Promise<AdjacencyList> {
  const taskConditions = [eq(tasks.isDeleted, false)];
  if (projectId) {
    taskConditions.push(eq(tasks.projectId, projectId));
  }

  const allTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(...taskConditions));

  const taskIdSet = new Set(allTasks.map((t) => t.id));

  const allRelations = await db
    .select({
      sourceTaskId: taskRelations.sourceTaskId,
      targetTaskId: taskRelations.targetTaskId,
    })
    .from(taskRelations);

  const adjacencyList: AdjacencyList = new Map();

  // Initialize all task nodes
  for (const task of allTasks) {
    adjacencyList.set(task.id, []);
  }

  // Add edges (only for tasks within scope)
  for (const rel of allRelations) {
    if (taskIdSet.has(rel.sourceTaskId) && taskIdSet.has(rel.targetTaskId)) {
      const deps = adjacencyList.get(rel.sourceTaskId);
      if (deps) {
        deps.push(rel.targetTaskId);
      }
    }
  }

  return adjacencyList;
}
