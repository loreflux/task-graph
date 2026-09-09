import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { taskRelations as taskRelationsTable } from './task-relations';
import { taskTags } from './task-tags';
import { activityLogs } from './activity-logs';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const taskStatusEnum = pgEnum('task_status', [
  'INBOX',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'ARCHIVED',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

// ---------------------------------------------------------------------------
// Tasks table
// ---------------------------------------------------------------------------

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('INBOX'),
  priority: taskPriorityEnum('priority').notNull().default('NONE'),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  /** Parent task id — models the tree (parent-child) hierarchy. */
  parentId: uuid('parent_id').references((): any => tasks.id, { onDelete: 'set null' }),
  /** Scheduled start (UTC). */
  startAt: timestamp('start_at', { withTimezone: true }),
  /** Scheduled end / due date (UTC). */
  endAt: timestamp('end_at', { withTimezone: true }),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  /** Estimated duration in minutes. */
  estimatedDuration: integer('estimated_duration'),
  /** Actual duration in minutes. */
  actualDuration: integer('actual_duration'),
  /** Ordering position within its siblings / list. */
  sortOrder: integer('sort_order').default(0).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  /** The project this task belongs to. */
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),

  /** Parent task (tree hierarchy). */
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: 'parentChild',
  }),

  /** Direct children (tree hierarchy). */
  children: many(tasks, {
    relationName: 'parentChild',
  }),

  /** Relations where this task is the *source* (i.e. this task depends on …). */
  sourceRelations: many(taskRelationsTable, {
    relationName: 'sourceTask',
  }),

  /** Relations where this task is the *target* (i.e. … depends on this task). */
  targetRelations: many(taskRelationsTable, {
    relationName: 'targetTask',
  }),

  /** Tags applied to this task (many-to-many join). */
  taskTags: many(taskTags),

  /** Activity log entries for this task. */
  activityLogs: many(activityLogs),
}));
