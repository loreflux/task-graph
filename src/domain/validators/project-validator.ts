import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Project
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be at most 255 characters'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code (e.g. #3b82f6)')
    .optional(),
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;

// ---------------------------------------------------------------------------
// Update Project
// ---------------------------------------------------------------------------

export const updateProjectSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be at most 255 characters')
    .optional(),
  description: z.string().nullish(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code (e.g. #3b82f6)')
    .nullish(),
});

export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
