import { pgTable, uuid, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tasks } from './tasks';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const actionTypeEnum = pgEnum('action_type', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'COMPLETE',
  'UNCOMPLETE',
  'ADD_DEPENDENCY',
  'REMOVE_DEPENDENCY',
  'MOVE',
  'ARCHIVE',
  'RESTORE',
  'BATCH_COMPLETE',
  'BATCH_ARCHIVE',
  'BATCH_DELETE',
]);

// ---------------------------------------------------------------------------
// Activity Logs table
// ---------------------------------------------------------------------------

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** The task this action was performed on (nullable for deleted tasks). */
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  actionType: actionTypeEnum('action_type').notNull(),
  /** Snapshot of relevant fields *before* the mutation (`null` for CREATE). */
  beforeState: jsonb('before_state'),
  /** Snapshot of relevant fields *after* the mutation (`null` for DELETE). */
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [activityLogs.taskId],
    references: [tasks.id],
  }),
}));
