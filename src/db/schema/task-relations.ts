import { pgTable, uuid, text, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tasks } from './tasks';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const relationTypeEnum = pgEnum('relation_type', ['DEPENDS_ON']);

// ---------------------------------------------------------------------------
// Task Relations table (dependency edges in the DAG)
// ---------------------------------------------------------------------------

export const taskRelations = pgTable(
  'task_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The task that *depends on* the target. */
    sourceTaskId: uuid('source_task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    /** The task that must be completed first. */
    targetTaskId: uuid('target_task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    relationType: relationTypeEnum('relation_type').notNull().default('DEPENDS_ON'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_task_relation').on(table.sourceTaskId, table.targetTaskId, table.relationType),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const taskRelationsRelations = relations(taskRelations, ({ one }) => ({
  /** The task that depends on another. */
  sourceTask: one(tasks, {
    fields: [taskRelations.sourceTaskId],
    references: [tasks.id],
    relationName: 'sourceTask',
  }),

  /** The task that must be completed first. */
  targetTask: one(tasks, {
    fields: [taskRelations.targetTaskId],
    references: [tasks.id],
    relationName: 'targetTask',
  }),
}));
