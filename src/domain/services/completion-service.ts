/**
 * @module domain/services/completion-service
 * @description Manages task completion semantics and propagation strategies.
 *
 * Implements:
 * - Single task completion
 * - Task + parent-child subtree completion
 * - Task + dependency ancestor closure completion
 * - Batch completion
 * - Uncomplete with status reset
 * - Pre-completion preview for impact assessment
 * - Unfinished dependencies check for suggestion mode
 */

import { eq, inArray, and, SQL } from 'drizzle-orm';
import { db } from '@/db';
import { tasks, activityLogs } from '@/db/schema';
import type { Task } from '@/types';
import { relationService } from './relation-service';
import { findAncestors } from '@/lib/graph-algorithms/ancestors';

export const CompletionStrategy = {
  SINGLE: 'SINGLE',
  WITH_CHILDREN: 'WITH_CHILDREN',
  WITH_DEPENDENCIES: 'WITH_DEPENDENCIES',
} as const;

export type CompletionStrategy =
  (typeof CompletionStrategy)[keyof typeof CompletionStrategy];

function rowToTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    projectId: row.projectId,
    parentId: row.parentId,
    startAt: row.startAt,
    endAt: row.endAt,
    isAllDay: row.isAllDay,
    estimatedDuration: row.estimatedDuration,
    actualDuration: row.actualDuration,
    sortOrder: row.sortOrder,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const completionService = {
  /**
   * Complete only the specified task.
   */
  async completeTask(taskId: string): Promise<{ completed: string[] }> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.isDeleted, false)));

      if (!existing) {
        throw new Error(`Task not found: ${taskId}`);
      }

      await tx
        .update(tasks)
        .set({ status: 'DONE', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      await tx.insert(activityLogs).values({
        taskId,
        actionType: 'COMPLETE',
        beforeState: { status: existing.status },
        afterState: { status: 'DONE' },
      });

      return { completed: [taskId] };
    });
  },

  /**
   * Complete a task and all of its recursive children in the parent-child tree.
   */
  async completeWithChildren(taskId: string): Promise<{ completed: string[] }> {
    return db.transaction(async (tx) => {
      const allSubtreeIds = await this.getSubtreeTaskIds(taskId, tx);

      if (allSubtreeIds.length === 0) {
        return { completed: [] };
      }

      await tx
        .update(tasks)
        .set({ status: 'DONE', updatedAt: new Date() })
        .where(inArray(tasks.id, allSubtreeIds));

      for (const id of allSubtreeIds) {
        await tx.insert(activityLogs).values({
          taskId: id,
          actionType: 'COMPLETE',
          beforeState: null,
          afterState: { status: 'DONE', reason: 'COMPLETE_SUBTREE' },
        });
      }

      return { completed: allSubtreeIds };
    });
  },

  /**
   * Complete a task and all of its unfinished dependency ancestors (closure).
   */
  async completeWithDependencies(taskId: string): Promise<{ completed: string[] }> {
    return db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.isDeleted, false)));

      if (!target) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Build adjacency list for ancestors
      const adj = await relationService.buildAdjacencyList(target.projectId ?? undefined);
      const ancestorIds = findAncestors(adj, taskId);
      const allCandidateIds = Array.from(new Set([taskId, ...ancestorIds]));

      // Only mark those that are not already DONE
      const toCompleteRows = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            inArray(tasks.id, allCandidateIds),
            eq(tasks.isDeleted, false),
          ),
        );

      const targetIds = toCompleteRows.map((r) => r.id);

      if (targetIds.length > 0) {
        await tx
          .update(tasks)
          .set({ status: 'DONE', updatedAt: new Date() })
          .where(inArray(tasks.id, targetIds));

        for (const id of targetIds) {
          await tx.insert(activityLogs).values({
            taskId: id,
            actionType: 'COMPLETE',
            beforeState: null,
            afterState: { status: 'DONE', reason: 'COMPLETE_DEPENDENCY_CLOSURE' },
          });
        }
      }

      return { completed: targetIds };
    });
  },

  /**
   * Batch complete a list of tasks.
   */
  async batchComplete(taskIds: string[]): Promise<{ completed: string[] }> {
    if (taskIds.length === 0) return { completed: [] };

    return db.transaction(async (tx) => {
      const validRows = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(inArray(tasks.id, taskIds), eq(tasks.isDeleted, false)));

      const ids = validRows.map((r) => r.id);
      if (ids.length === 0) return { completed: [] };

      await tx
        .update(tasks)
        .set({ status: 'DONE', updatedAt: new Date() })
        .where(inArray(tasks.id, ids));

      for (const id of ids) {
        await tx.insert(activityLogs).values({
          taskId: id,
          actionType: 'BATCH_COMPLETE',
          beforeState: null,
          afterState: { status: 'DONE' },
        });
      }

      return { completed: ids };
    });
  },

  /**
   * Revert a task's status from DONE back to TODO.
   */
  async uncompleteTask(taskId: string): Promise<Task> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.isDeleted, false)));

      if (!existing) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const [row] = await tx
        .update(tasks)
        .set({ status: 'TODO', updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .returning();

      await tx.insert(activityLogs).values({
        taskId,
        actionType: 'UNCOMPLETE',
        beforeState: { status: existing.status },
        afterState: { status: 'TODO' },
      });

      return rowToTask(row!);
    });
  },

  /**
   * Get impact preview for completing a task under a specific strategy.
   */
  async getCompletionPreview(
    taskId: string,
    strategy: CompletionStrategy,
  ): Promise<{ affectedTasks: Task[]; count: number }> {
    if (strategy === CompletionStrategy.SINGLE) {
      const [task] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.isDeleted, false)));
      if (!task) return { affectedTasks: [], count: 0 };
      const domainTask = rowToTask(task);
      return { affectedTasks: [domainTask], count: 1 };
    }

    if (strategy === CompletionStrategy.WITH_CHILDREN) {
      const subtreeIds = await this.getSubtreeTaskIds(taskId);
      const rows = await db
        .select()
        .from(tasks)
        .where(and(inArray(tasks.id, subtreeIds), eq(tasks.isDeleted, false)));
      const domainTasks = rows.map(rowToTask);
      return { affectedTasks: domainTasks, count: domainTasks.length };
    }

    if (strategy === CompletionStrategy.WITH_DEPENDENCIES) {
      const [target] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.isDeleted, false)));

      if (!target) return { affectedTasks: [], count: 0 };

      const adj = await relationService.buildAdjacencyList(target.projectId ?? undefined);
      const ancestorIds = findAncestors(adj, taskId);
      const candidateIds = Array.from(new Set([taskId, ...ancestorIds]));

      const rows = await db
        .select()
        .from(tasks)
        .where(
          and(
            inArray(tasks.id, candidateIds),
            eq(tasks.isDeleted, false),
          ),
        );

      const domainTasks = rows.map(rowToTask);
      return { affectedTasks: domainTasks, count: domainTasks.length };
    }

    return { affectedTasks: [], count: 0 };
  },

  /**
   * Check if a task has unfinished predecessor dependencies (Suggestion Mode).
   */
  async checkUnfinishedDependencies(
    taskId: string,
  ): Promise<{ count: number; tasks: Task[] }> {
    const deps = await relationService.getDependencies(taskId);
    if (deps.length === 0) {
      return { count: 0, tasks: [] };
    }

    const depTargetIds = deps.map((d) => d.targetTaskId);
    const unfinishedRows = await db
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.id, depTargetIds),
          eq(tasks.isDeleted, false),
        ),
      );

    // Filter out DONE tasks
    const pending = unfinishedRows.filter((r) => r.status !== 'DONE').map(rowToTask);
    return { count: pending.length, tasks: pending };
  },

  /**
   * Internal recursive helper to get all task IDs in a parent-child subtree.
   */
  async getSubtreeTaskIds(
    rootId: string,
    txContext?: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ): Promise<string[]> {
    const executor = txContext ?? db;
    const result: string[] = [rootId];
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const currentParentId = queue.shift()!;
      const children = await executor
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.parentId, currentParentId), eq(tasks.isDeleted, false)));

      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }

    return result;
  },
};
