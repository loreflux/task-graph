import { z } from 'zod';

// ---------------------------------------------------------------------------
// Relation type schema
// ---------------------------------------------------------------------------

export const relationTypeSchema = z.enum(['DEPENDS_ON']);

// ---------------------------------------------------------------------------
// Create Relation
// ---------------------------------------------------------------------------

export const createRelationSchema = z
  .object({
    sourceTaskId: z.string().uuid('Invalid source task ID'),
    targetTaskId: z.string().uuid('Invalid target task ID'),
    relationType: relationTypeSchema.default('DEPENDS_ON'),
    description: z.string().optional(),
  })
  .refine((data) => data.sourceTaskId !== data.targetTaskId, {
    message: 'A task cannot depend on itself',
    path: ['targetTaskId'],
  });

export type CreateRelationSchema = z.infer<typeof createRelationSchema>;

// ---------------------------------------------------------------------------
// Delete Relation
// ---------------------------------------------------------------------------

export const deleteRelationSchema = z.object({
  relationId: z.string().uuid('Invalid relation ID'),
});

export type DeleteRelationSchema = z.infer<typeof deleteRelationSchema>;
