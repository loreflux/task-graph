'use server';

import { eq, and, desc, asc, isNull, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { tasks, taskRelations, projects } from '@/db/schema';
import type { Task, TaskWithRelations, TaskRelation } from '@/types';
import { relationService } from '@/domain/services/relation-service';
import { getBlockedTasks } from '@/lib/graph-algorithms/blocked-analysis';

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

export async function getTasks(options?: {
  projectId?: string;
  includeArchived?: boolean;
}): Promise<Task[]> {
  const conditions = [eq(tasks.isDeleted, false)];

  if (options?.projectId) {
    conditions.push(eq(tasks.projectId, options.projectId));
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));

  let result = rows.map(rowToTask);
  if (!options?.includeArchived) {
    result = result.filter((t) => t.status !== 'ARCHIVED');
  }

  return result;
}

export async function getTaskById(id: string): Promise<TaskWithRelations | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.isDeleted, false)));

  if (!row) return null;

  const children = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, id), eq(tasks.isDeleted, false)))
    .orderBy(asc(tasks.sortOrder));

  const dependencies = await db
    .select()
    .from(taskRelations)
    .where(eq(taskRelations.sourceTaskId, id));

  const dependents = await db
    .select()
    .from(taskRelations)
    .where(eq(taskRelations.targetTaskId, id));

  return {
    ...rowToTask(row),
    children: children.map(rowToTask),
    dependencies: dependencies.map((r) => ({
      id: r.id,
      sourceTaskId: r.sourceTaskId,
      targetTaskId: r.targetTaskId,
      relationType: r.relationType as TaskRelation['relationType'],
      description: r.description,
      createdAt: r.createdAt,
    })),
    dependents: dependents.map((r) => ({
      id: r.id,
      sourceTaskId: r.sourceTaskId,
      targetTaskId: r.targetTaskId,
      relationType: r.relationType as TaskRelation['relationType'],
      description: r.description,
      createdAt: r.createdAt,
    })),
  };
}

export async function getInboxTasks(): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'INBOX'),
        eq(tasks.isDeleted, false),
      ),
    )
    .orderBy(desc(tasks.createdAt));

  return rows.map(rowToTask);
}

export async function getTodayTasksData(): Promise<{
  todayTasks: Task[];
  overdueTasks: Task[];
  inProgressTasks: Task[];
  blockedTasks: Task[];
  upcomingTasks: Task[];
}> {
  const allActiveTasks = await getTasks({ includeArchived: false });
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const threeDaysLater = new Date(todayEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Compute blocked tasks using graph
  const adj = await relationService.buildAdjacencyList();
  const completedIds = new Set(
    allActiveTasks.filter((t) => t.status === 'DONE').map((t) => t.id),
  );
  const blockedAnalyses = getBlockedTasks(adj, completedIds);
  const blockedIdSet = new Set(
    blockedAnalyses
      .filter((b) => b.isDirectlyBlocked && b.blockedBy.length > 0)
      .map((b) => b.taskId),
  );

  const todayTasks: Task[] = [];
  const overdueTasks: Task[] = [];
  const inProgressTasks: Task[] = [];
  const blockedTasks: Task[] = [];
  const upcomingTasks: Task[] = [];

  for (const t of allActiveTasks) {
    if (t.status === 'DONE') continue;

    // Derived or explicit blocked
    if (t.status === 'BLOCKED' || blockedIdSet.has(t.id)) {
      blockedTasks.push(t);
    }

    if (t.status === 'IN_PROGRESS') {
      inProgressTasks.push(t);
    }

    if (t.endAt) {
      const end = new Date(t.endAt);
      if (end < now) {
        overdueTasks.push(t);
      } else if (end >= todayStart && end <= todayEnd) {
        todayTasks.push(t);
      } else if (end > todayEnd && end <= threeDaysLater) {
        upcomingTasks.push(t);
      }
    } else if (t.startAt) {
      const start = new Date(t.startAt);
      if (start >= todayStart && start <= todayEnd) {
        todayTasks.push(t);
      }
    }
  }

  return {
    todayTasks,
    overdueTasks,
    inProgressTasks,
    blockedTasks,
    upcomingTasks,
  };
}

export async function getArchivedTasks(): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'ARCHIVED'),
        eq(tasks.isDeleted, false),
      ),
    )
    .orderBy(desc(tasks.updatedAt));

  return rows.map(rowToTask);
}

export async function getTrashTasks(): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.isDeleted, true))
    .orderBy(desc(tasks.deletedAt));

  return rows.map(rowToTask);
}

export async function getAllRelations(projectId?: string): Promise<TaskRelation[]> {
  const rows = await db.select().from(taskRelations);
  return rows.map((r) => ({
    id: r.id,
    sourceTaskId: r.sourceTaskId,
    targetTaskId: r.targetTaskId,
    relationType: r.relationType as TaskRelation['relationType'],
    description: r.description,
    createdAt: r.createdAt,
  }));
}
