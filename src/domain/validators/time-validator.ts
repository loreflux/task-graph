import { z } from 'zod';

// ---------------------------------------------------------------------------
// Time Range
// ---------------------------------------------------------------------------

export const timeRangeSchema = z
  .object({
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
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

export type TimeRangeSchema = z.infer<typeof timeRangeSchema>;

// ---------------------------------------------------------------------------
// Schedule Conflict Check
// ---------------------------------------------------------------------------

export const scheduleConflictCheckSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  excludeTaskId: z.string().uuid('Invalid exclude task ID').optional(),
});

export type ScheduleConflictCheckSchema = z.infer<typeof scheduleConflictCheckSchema>;
