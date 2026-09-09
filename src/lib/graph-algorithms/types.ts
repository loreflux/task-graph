/**
 * @module graph-algorithms/types
 * @description Core type definitions for the Task Graph algorithm library.
 *
 * The AdjacencyList represents a directed acyclic graph (DAG) where:
 * - Each key is a task (node) ID
 * - Each value is an array of task IDs that the key task **depends on**
 * - Edges go FROM dependency TO dependent (i.e., if task A depends on task B,
 *   then adjacencyList.get(A) includes B)
 *
 * Example:
 * ```
 *   B ──→ A   (A depends on B)
 *   C ──→ A   (A depends on C)
 *
 *   adjacencyList = Map {
 *     "A" => ["B", "C"],
 *     "B" => [],
 *     "C" => []
 *   }
 * ```
 */

/**
 * A directed graph represented as an adjacency list.
 *
 * - Key: a node (task) ID
 * - Value: array of node IDs that the key node depends on
 *
 * Every node that participates in the graph should appear as a key,
 * even if it has no dependencies (value = []).
 */
export type AdjacencyList = Map<string, string[]>;

/**
 * Result of a cycle detection check on the graph.
 */
export interface CycleDetectionResult {
  /** Whether a cycle was detected. */
  hasCycle: boolean;

  /**
   * The ordered list of node IDs forming the cycle, or `null` if no cycle exists.
   * When present, the first and last elements are the same node, illustrating the loop.
   * Example: ["A", "B", "C", "A"]
   */
  cyclePath: string[] | null;
}

/**
 * Analysis of why a specific task is blocked.
 */
export interface BlockedAnalysis {
  /** The task being analyzed. */
  taskId: string;

  /**
   * List of incomplete task IDs that this task depends on.
   * Empty if the task is not blocked.
   */
  blockedBy: string[];

  /**
   * Whether the task has at least one incomplete direct dependency.
   * Equivalent to `blockedBy.length > 0`.
   */
  isDirectlyBlocked: boolean;
}

/**
 * Analysis of what completing a specific task would unlock.
 */
export interface UnlockAnalysis {
  /** The task being analyzed (the one hypothetically completed). */
  taskId: string;

  /**
   * Tasks where `taskId` is the **only** remaining incomplete dependency.
   * These would immediately become unblocked.
   */
  directUnlocks: string[];

  /**
   * Tasks that would eventually become unblocked through a chain reaction
   * after all `directUnlocks` (and their cascading unlocks) are resolved.
   * Does NOT include tasks already in `directUnlocks`.
   */
  indirectUnlocks: string[];
}
