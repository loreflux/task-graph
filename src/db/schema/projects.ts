import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tasks } from './tasks';

// ---------------------------------------------------------------------------
// Projects table
// ---------------------------------------------------------------------------

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  /** Hex colour code (e.g. "#3b82f6"). */
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
}));
