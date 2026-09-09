/**
 * @module domain/services/task-service
 * @description Core CRUD and lifecycle operations for tasks.
 *
 * All database mutations go through this service. It handles:
 * - Create, read, update, soft-delete, restore, archive
 * - Parent-child tree operations (moveTask)
 * - Filtered listing with pagination
 * - Activity log recording for auditable mutations
 */

import { eq, and, inArray, ilike, gte, lte, desc, asc, isNull, SQL } from 'drizzle-orm';
import { db } from '@/db';
import { tasks, taskRelations, activityLogs } from '@/db/schema';
import type {
  Task,
  TaskWithRelations,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types';
import {
  createTaskSchema,
  updateTaskSchema,
  batchUpdateSchema,
  taskFiltersSchema,
  type TaskFiltersSchema,
  type BatchUpdateSchema,
} from '@/domain/validators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a Drizzle row to a Task domain object.
 * Drizzle returns plain objects matching the schema; this provides a typed cast.
 */
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const taskService = {
  /**
   * Create a new task.
   *
   * Validates input via Zod, inserts into DB, and logs a CREATE activity.
   *
   * @param input - Raw create-task input (will be validated).
   * @returns The newly created task.
   * @throws {Error} If validation fails.
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const parsed = createTaskSchema.parse(input);

    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(tasks)
        .values({
          title: parsed.title,
          description: parsed.description ?? null,
          status: parsed.status,
          priority: parsed.priority,
          projectId: parsed.projectId ?? null,
          parentId: parsed.parentId ?? null,
          startAt: parsed.startAt ?? null,
          endAt: parsed.endAt ?? null,
          isAllDay: parsed.isAllDay,
          estimatedDuration: parsed.estimatedDuration ?? null,
          actualDuration: parsed.actualDuration ?? null,
        })
        .returning();

      // Log the creation
      await tx.insert(activityLogs).values({
        taskId: row!.id,
        actionType: 'CREATE',
        beforeState: null,
        afterState: { title: row!.title, status: row!.status },
      });

      return rowToTask(row!);
    });
  },

  /**
   * Update an existing task.
   *
   * Only the provided fields are updated. Records before/after state in
   * activity log.
   *
   * @param id - Task UUID.
   * @param input - Partial update fields.
   * @returns The updated task.
   * @throws {Error} If the task is not found or validation fails.
   */
  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const parsed = updateTaskSchema.parse({ id, ...input });
    const { id: _id, ...updates } = parsed;

    // Strip undefined values so we only SET what's explicitly provided
    const setValues: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setValues[key] = value;
      }
    }

    if (Object.keys(setValues).length === 0) {
      // Nothing to update — return current state
      const existing = await this.getTask(id);
      if (!existing) throw new Error(`Task not found: ${id}`);
      return existing;
    }

    setValues.updatedAt = new Date();

    return db.transaction(async (tx) => {
      // Fetch before-state
      const [before] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.isDeleted, false)));

      if (!before) {
        throw new Error(`Task not found: ${id}`);
      }

      const [row] = await tx
        .update(tasks)
        .set(setValues)
        .where(eq(tasks.id, id))
        .returning();

      await tx.insert(activityLogs).values({
        taskId: id,
        actionType: 'UPDATE',
        beforeState: { status: before.status, title: before.title, priority: before.priority },
        afterState: setValues as Record<string, unknown>,
      });

      return rowToTask(row!);
    });
  },

  /**
   * Delete a task (soft-delete by default, permanent if specified).
   *
   * Soft delete sets `isDeleted = true` and `deletedAt` to now.
   * Permanent delete removes the row entirely (cascades to relations).
   *
   * @param id - Task UUID.
   * @param permanent - If true, hard-delete the row. Default: false.
   */
  async deleteTask(id: string, permanent = false): Promise<void> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, id));

      if (!existing) {
        throw new Error(`Task not found: ${id}`);
      }

      if (permanent) {
        await tx.delete(tasks).where(eq(tasks.id, id));
      } else {
        await tx
          .update(tasks)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, id));
      }

      await tx.insert(activityLogs).values({
        taskId: permanent ? null : id,
        actionType: 'DELETE',
        beforeState: { title: existing.title, status: existing.status },
        afterState: null,
      });
    });
  },

  /**
   * Restore a soft-deleted task.
   *
   * @param id - Task UUID.
   * @returns The restored task.
   * @throws {Error} If task is not found or not deleted.
   */
  async restoreTask(id: string): Promise<Task> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.isDeleted, true)));

      if (!existing) {
        throw new Error(`Deleted task not found: ${id}`);
      }

      const [row] = await tx
        .update(tasks)
        .set({
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();

      await tx.insert(activityLogs).values({
        taskId: id,
        actionType: 'RESTORE',
        beforeState: { isDeleted: true },
        afterState: { isDeleted: false },
      });

      return rowToTask(row!);
    });
  },

  /**
   * Archive a task (sets status to ARCHIVED).
   *
   * @param id - Task UUID.
   * @returns The archived task.
   */
  async archiveTask(id: string): Promise<Task> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.isDeleted, false)));

      if (!existing) {
        throw new Error(`Task not found: ${id}`);
      }

      const [row] = await tx
        .update(tasks)
        .set({
          status: 'ARCHIVED',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();

      await tx.insert(activityLogs).values({
        taskId: id,
        actionType: 'ARCHIVE',
        beforeState: { status: existing.status },
        afterState: { status: 'ARCHIVED' },
      });

      return rowToTask(row!);
    });
  },

  /**
   * Get a single task by ID with all its relations loaded.
   *
   * Loads children (parent-child), dependencies (source relations),
   * and dependents (target relations).
   *
   * @param id - Task UUID.
   * @returns The task with relations, or null if not found.
   */
  async getTask(id: string): Promise<TaskWithRelations | null> {
    const [row] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.isDeleted, false)));

    if (!row) return null;

    // Load children
    const children = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentId, id), eq(tasks.isDeleted, false)))
      .orderBy(asc(tasks.sortOrder));

    // Load dependencies (where this task is the source — it depends on targets)
    const dependencies = await db
      .select()
      .from(taskRelations)
      .where(eq(taskRelations.sourceTaskId, id));

    // Load dependents (where this task is the target — others depend on it)
    const dependents = await db
      .select()
      .from(taskRelations)
      .where(eq(taskRelations.targetTaskId, id));

    return {
      ...rowToTask(row),
      children: children.map(rowToTask),
      dependencies,
      dependents,
    };
  },

  /**
   * List tasks with filtering and pagination.
   *
   * Supports filtering by status, priority, project, parent, search text,
   * date ranges, and soft-delete state.
   *
   * @param filters - Validated filter parameters.
   * @returns Array of matching tasks.
   */
  async listTasks(filters: TaskFiltersSchema): Promise<Task[]> {
    const parsed = taskFiltersSchema.parse(filters);
    const conditions: SQL[] = [];

    // Default: exclude deleted tasks unless explicitly requested
    if (parsed.isDeleted !== undefined) {
      conditions.push(eq(tasks.isDeleted, parsed.isDeleted));
    } else {
      conditions.push(eq(tasks.isDeleted, false));
    }

    if (parsed.status && parsed.status.length > 0) {
      conditions.push(inArray(tasks.status, parsed.status));
    }

    if (parsed.priority && parsed.priority.length > 0) {
      conditions.push(inArray(tasks.priority, parsed.priority));
    }

    if (parsed.projectId) {
      conditions.push(eq(tasks.projectId, parsed.projectId));
    }

    if (parsed.parentId !== undefined) {
      if (parsed.parentId === null) {
        conditions.push(isNull(tasks.parentId));
      } else {
        conditions.push(eq(tasks.parentId, parsed.parentId));
      }
    }

    if (parsed.search) {
      conditions.push(ilike(tasks.title, `%${parsed.search}%`));
    }

    if (parsed.startAfter) {
      conditions.push(gte(tasks.startAt, parsed.startAfter));
    }

    if (parsed.endBefore) {
      conditions.push(lte(tasks.endAt, parsed.endBefore));
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset);

    return rows.map(rowToTask);
  },

  /**
   * Get all tasks belonging to a project.
   *
   * @param projectId - Project UUID.
   * @returns Array of tasks in the project (excluding deleted).
   */
  async getTasksByProject(projectId: string): Promise<Task[]> {
    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.projectId, projectId), eq(tasks.isDeleted, false)),
      )
      .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));

    return rows.map(rowToTask);
  },

  /**
   * Get direct children of a task (parent-child tree).
   *
   * @param taskId - Parent task UUID.
   * @returns Array of child tasks.
   */
  async getTaskChildren(taskId: string): Promise<Task[]> {
    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.parentId, taskId), eq(tasks.isDeleted, false)),
      )
      .orderBy(asc(tasks.sortOrder));

    return rows.map(rowToTask);
  },

  /**
   * Move a task to a new parent (or to root if newParentId is null).
   *
   * Updates the parent-child tree hierarchy. Validates that the new parent
   * exists and is not a descendant of the task (to prevent tree cycles).
   *
   * @param taskId - The task to move.
   * @param newParentId - The new parent task ID, or null for root.
   * @returns The updated task.
   * @throws {Error} If the move would create a tree cycle.
   */
  async moveTask(taskId: string, newParentId: string | null): Promise<Task> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.isDeleted, false)));

      if (!existing) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (newParentId !== null) {
        // Verify new parent exists
        const [parent] = await tx
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, newParentId), eq(tasks.isDeleted, false)));

        if (!parent) {
          throw new Error(`Parent task not found: ${newParentId}`);
        }

        // Prevent tree cycles: walk up from newParentId to ensure taskId is not an ancestor
        let current: string | null = newParentId;
        while (current !== null) {
          if (current === taskId) {
            throw new Error(
              'Cannot move task under its own descendant — this would create a cycle in the tree',
            );
          }
          const [ancestor] = await tx
            .select({ parentId: tasks.parentId })
            .from(tasks)
            .where(eq(tasks.id, current));
          current = ancestor?.parentId ?? null;
        }
      }

      const oldParentId = existing.parentId;

      const [row] = await tx
        .update(tasks)
        .set({
          parentId: newParentId,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      await tx.insert(activityLogs).values({
        taskId,
        actionType: 'MOVE',
        beforeState: { parentId: oldParentId },
        afterState: { parentId: newParentId },
      });

      return rowToTask(row!);
    });
  },

  /**
   * Batch update multiple tasks at once.
   *
   * Applied within a single transaction for atomicity.
   *
   * @param input - Object with `ids` array and `updates` fields.
   * @returns Array of updated tasks.
   */
  async batchUpdate(input: BatchUpdateSchema): Promise<Task[]> {
    const parsed = batchUpdateSchema.parse(input);

    const setValues: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.updates)) {
      if (value !== undefined) {
        setValues[key] = value;
      }
    }

    if (Object.keys(setValues).length === 0) {
      // Nothing to update
      const rows = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.id, parsed.ids));
      return rows.map(rowToTask);
    }

    setValues.updatedAt = new Date();

    return db.transaction(async (tx) => {
      const rows = await tx
        .update(tasks)
        .set(setValues)
        .where(inArray(tasks.id, parsed.ids))
        .returning();

      // Log batch update for each task
      for (const row of rows) {
        await tx.insert(activityLogs).values({
          taskId: row.id,
          actionType: 'UPDATE',
          beforeState: null,
          afterState: setValues as Record<string, unknown>,
        });
      }

      return rows.map(rowToTask);
    });
  },
};
