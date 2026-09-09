import type { Task, TaskStatus, TaskPriority } from './task';

// ---------------------------------------------------------------------------
// Graph node / edge types (used by @xyflow/react and graph algorithms)
// ---------------------------------------------------------------------------

export interface GraphNodeData {
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Whether this task is blocked by unfinished dependencies. */
  isBlocked: boolean;
}

export interface GraphNode {
  id: string;
  data: GraphNodeData;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** Visual edge type (e.g. "dependency", "parentChild"). */
  type: string;
}

// ---------------------------------------------------------------------------
// Adjacency list – used by pure graph algorithm functions
// ---------------------------------------------------------------------------

/** Maps a node id to the set of node ids it has directed edges to. */
export type AdjacencyList = Map<string, Set<string>>;

// ---------------------------------------------------------------------------
// Algorithm result types
// ---------------------------------------------------------------------------

export interface CycleDetectionResult {
  hasCycle: boolean;
  /** The ids forming the cycle, in order. `null` when no cycle exists. */
  cyclePath: string[] | null;
}

export interface BlockedAnalysis {
  taskId: string;
  /** Ids of all tasks (direct + transitive) blocking this task. */
  blockedBy: string[];
  /** `true` when at least one *direct* dependency is unfinished. */
  isDirectlyBlocked: boolean;
}

export interface UnlockAnalysis {
  taskId: string;
  /** Tasks that would become unblocked immediately upon completing this task. */
  directUnlocks: string[];
  /** Tasks further downstream that would transitively become unblockable. */
  indirectUnlocks: string[];
}

export interface CriticalPathResult {
  /** Ordered list of task ids forming the longest dependency chain. */
  path: string[];
  /** Sum of estimated durations (in minutes) along the critical path. */
  totalDuration: number;
}
