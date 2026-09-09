import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum schemas
// ---------------------------------------------------------------------------

export const taskStatusSchema = z.enum([
  'INBOX',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'ARCHIVED',
]);

export const taskPrioritySchema = z.enum([
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

// ---------------------------------------------------------------------------
// Create Task
// ---------------------------------------------------------------------------

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(500, 'Title must be at most 500 characters'),
    description: z.string().optional(),
    status: taskStatusSchema.default('INBOX'),
    priority: taskPrioritySchema.default('NONE'),
    projectId: z.string().uuid('Invalid project ID').optional(),
    parentId: z.string().uuid('Invalid parent task ID').optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    isAllDay: z.boolean().default(false),
    estimatedDuration: z
      .number()
      .int('Estimated duration must be a whole number')
      .positive('Estimated duration must be positive')
      .optional(),
    actualDuration: z
      .number()
      .int('Actual duration must be a whole number')
      .positive('Actual duration must be positive')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        return data.endAt >= data.startAt;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endAt'],
    },
  );

export type CreateTaskSchema = z.infer<typeof createTaskSchema>;

// ---------------------------------------------------------------------------
// Update Task
// ---------------------------------------------------------------------------

export const updateTaskSchema = z
  .object({
    id: z.string().uuid('Invalid task ID'),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(500, 'Title must be at most 500 characters')
      .optional(),
    description: z.string().nullish(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    projectId: z.string().uuid('Invalid project ID').nullish(),
    parentId: z.string().uuid('Invalid parent task ID').nullish(),
    startAt: z.coerce.date().nullish(),
    endAt: z.coerce.date().nullish(),
    isAllDay: z.boolean().optional(),
    estimatedDuration: z
      .number()
      .int('Estimated duration must be a whole number')
      .positive('Estimated duration must be positive')
      .nullish(),
    actualDuration: z
      .number()
      .int('Actual duration must be a whole number')
      .positive('Actual duration must be positive')
      .nullish(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        return data.endAt >= data.startAt;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endAt'],
    },
  );

export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>;

// ---------------------------------------------------------------------------
// Batch Update
// ---------------------------------------------------------------------------

export const batchUpdateSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid task ID'))
    .min(1, 'At least one task ID is required'),
  updates: z
    .object({
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      projectId: z.string().uuid('Invalid project ID').nullish(),
      startAt: z.coerce.date().nullish(),
      endAt: z.coerce.date().nullish(),
      isAllDay: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.startAt && data.endAt) {
          return data.endAt >= data.startAt;
        }
        return true;
      },
      {
        message: 'End date must be on or after start date',
        path: ['endAt'],
      },
    ),
});

export type BatchUpdateSchema = z.infer<typeof batchUpdateSchema>;

// ---------------------------------------------------------------------------
// Task Filters (for listTasks queries)
// ---------------------------------------------------------------------------

export const taskFiltersSchema = z.object({
  status: z.array(taskStatusSchema).optional(),
  priority: z.array(taskPrioritySchema).optional(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().nullish(),
  isDeleted: z.boolean().optional(),
  search: z.string().optional(),
  startAfter: z.coerce.date().optional(),
  endBefore: z.coerce.date().optional(),
  limit: z.number().int().positive().max(200).default(100),
  offset: z.number().int().min(0).default(0),
});

export type TaskFiltersSchema = z.infer<typeof taskFiltersSchema>;
