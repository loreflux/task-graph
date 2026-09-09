import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { taskTags } from './task-tags';

// ---------------------------------------------------------------------------
// Tags table
// ---------------------------------------------------------------------------

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  /** Hex colour code (e.g. "#ef4444"). */
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
}));
