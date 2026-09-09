// ---------------------------------------------------------------------------
// Task Status – BLOCKED is derived at runtime from unfinished dependencies,
// but we still include it in the enum so the UI layer can reference it.
// ---------------------------------------------------------------------------

export const TaskStatus = {
  INBOX: 'INBOX',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// ---------------------------------------------------------------------------
// Task Priority
// ---------------------------------------------------------------------------

export const TaskPriority = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

// ---------------------------------------------------------------------------
// Relation Type – only DEPENDS_ON for now; PARENT_CHILD is modelled via
// the `parentId` column on the Task table, NOT via task_relations.
// ---------------------------------------------------------------------------

export const RelationType = {
  DEPENDS_ON: 'DEPENDS_ON',
} as const;

export type RelationType = (typeof RelationType)[keyof typeof RelationType];

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  /** Parent task id – models the tree (parent-child) hierarchy. */
  parentId: string | null;
  /** Scheduled start (UTC). */
  startAt: Date | null;
  /** Scheduled end / due date (UTC). */
  endAt: Date | null;
  isAllDay: boolean;
  /** Estimated duration in minutes. */
  estimatedDuration: number | null;
  /** Actual duration in minutes. */
  actualDuration: number | null;
  /** Ordering position within its siblings / list. */
  sortOrder: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Task Relation (dependency edge in the DAG)
// ---------------------------------------------------------------------------

export interface TaskRelation {
  id: string;
  /** The task that *depends on* the target. */
  sourceTaskId: string;
  /** The task that must be completed first. */
  targetTaskId: string;
  relationType: RelationType;
  description: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type CreateTaskInput = Pick<Task, 'title'> &
  Partial<
    Pick<
      Task,
      | 'description'
      | 'status'
      | 'priority'
      | 'projectId'
      | 'parentId'
      | 'startAt'
      | 'endAt'
      | 'isAllDay'
      | 'estimatedDuration'
      | 'actualDuration'
      | 'sortOrder'
    >
  >;

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'projectId'
    | 'parentId'
    | 'startAt'
    | 'endAt'
    | 'isAllDay'
    | 'estimatedDuration'
    | 'actualDuration'
    | 'sortOrder'
  >
>;

export type CreateRelationInput = Pick<
  TaskRelation,
  'sourceTaskId' | 'targetTaskId'
> &
  Partial<Pick<TaskRelation, 'relationType' | 'description'>>;

// ---------------------------------------------------------------------------
// Composite type – Task loaded with its relations
// ---------------------------------------------------------------------------

export interface TaskWithRelations extends Task {
  /** Direct children (parent-child tree). */
  children: Task[];
  /** Relations where this task is the *source* (i.e. this task depends on …). */
  dependencies: TaskRelation[];
  /** Relations where this task is the *target* (i.e. … depends on this task). */
  dependents: TaskRelation[];
}
