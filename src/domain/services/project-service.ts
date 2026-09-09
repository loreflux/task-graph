/**
 * @module domain/services/project-service
 * @description Project domain service handling project CRUD and analytics.
 */

import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';
import { createProjectSchema, updateProjectSchema } from '@/domain/validators';

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completionRate: number; // 0 to 100
}

function rowToProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const projectService = {
  /**
   * Create a new project.
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const parsed = createProjectSchema.parse(input);

    const [row] = await db
      .insert(projects)
      .values({
        name: parsed.name,
        description: parsed.description ?? null,
        color: parsed.color ?? '#3b82f6',
      })
      .returning();

    return rowToProject(row!);
  },

  /**
   * Update an existing project.
   */
  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    const parsed = updateProjectSchema.parse({ id, ...input });
    const { id: _id, ...updates } = parsed;

    const setValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.color !== undefined) setValues.color = updates.color;

    const [row] = await db
      .update(projects)
      .set(setValues)
      .where(eq(projects.id, id))
      .returning();

    if (!row) {
      throw new Error(`Project not found: ${id}`);
    }

    return rowToProject(row);
  },

  /**
   * Delete a project. Unlinks any tasks assigned to this project (sets projectId to null).
   */
  async deleteProject(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Unlink tasks
      await tx
        .update(tasks)
        .set({ projectId: null, updatedAt: new Date() })
        .where(eq(tasks.projectId, id));

      // Delete project
      await tx.delete(projects).where(eq(projects.id, id));
    });
  },

  /**
   * Get project by ID.
   */
  async getProject(id: string): Promise<Project | null> {
    const [row] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    return row ? rowToProject(row) : null;
  },

  /**
   * List all projects.
   */
  async listProjects(): Promise<Project[]> {
    const rows = await db
      .select()
      .from(projects)
      .orderBy(asc(projects.name));

    return rows.map(rowToProject);
  },

  /**
   * Calculate project statistics (completion rate, blocked, overdue, etc.)
   */
  async getProjectStats(id: string): Promise<ProjectStats> {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, id), eq(tasks.isDeleted, false)));

    const now = new Date();
    const total = projectTasks.length;
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;
    let overdue = 0;

    for (const t of projectTasks) {
      if (t.status === 'DONE') {
        completed++;
      } else {
        if (t.status === 'IN_PROGRESS') inProgress++;
        if (t.status === 'BLOCKED') blocked++;
        if (t.endAt && new Date(t.endAt) < now) overdue++;
      }
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      blockedTasks: blocked,
      overdueTasks: overdue,
      completionRate,
    };
  },
};
