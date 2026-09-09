// ---------------------------------------------------------------------------
// Action Type – every mutation against a task is logged with one of these.
// ---------------------------------------------------------------------------

export const ActionType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  COMPLETE: 'COMPLETE',
  UNCOMPLETE: 'UNCOMPLETE',
  ADD_DEPENDENCY: 'ADD_DEPENDENCY',
  REMOVE_DEPENDENCY: 'REMOVE_DEPENDENCY',
  MOVE: 'MOVE',
  ARCHIVE: 'ARCHIVE',
  RESTORE: 'RESTORE',
  BATCH_COMPLETE: 'BATCH_COMPLETE',
  BATCH_ARCHIVE: 'BATCH_ARCHIVE',
  BATCH_DELETE: 'BATCH_DELETE',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

// ---------------------------------------------------------------------------
// Activity Log
// ---------------------------------------------------------------------------

export interface ActivityLog {
  id: string;
  /** The task this action was performed on. */
  taskId: string;
  actionType: ActionType;
  /** Snapshot of relevant fields *before* the mutation (`null` for CREATE). */
  beforeState: Record<string, unknown> | null;
  /** Snapshot of relevant fields *after* the mutation (`null` for DELETE). */
  afterState: Record<string, unknown> | null;
  createdAt: Date;
}
