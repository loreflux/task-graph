/**
 * @module graph-algorithms/dependency-closure
 * @description Transitive closure of dependencies for a given task.
 *
 * The dependency closure of a task is the set of ALL tasks that must be
 * completed before it can start — both direct and indirect dependencies.
 * This is equivalent to computing all ancestors in the DAG.
 *
 * This is useful for:
 * - Showing the full scope of work required before a task can begin
 * - Calculating accurate progress percentages
 * - Detecting overly deep dependency chains
 */

import type { AdjacencyList } from './types';
import { findAncestors } from './ancestors';

/**
 * Computes the transitive closure of dependencies for a given task.
 *
 * Returns every task ID that the given task depends on, directly or
 * transitively. This is functionally equivalent to {@link findAncestors}
 * but provides a more domain-specific name for use in dependency analysis.
 *
 * @param adjacencyList - The dependency graph.
 * @param taskId - The task whose dependency closure to compute.
 * @returns An array of all task IDs in the dependency closure.
 *          Returns an empty array if the task has no dependencies or
 *          is not in the graph.
 *
 * @example
 * ```ts
 * // A depends on B, B depends on C and D
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C", "D"]],
 *   ["C", []],
 *   ["D", []],
 * ]);
 *
 * getDependencyClosure(graph, "A");
 * // => ["B", "C", "D"]  (all tasks A transitively depends on)
 * ```
 *
 * @example
 * ```ts
 * // Task with no dependencies
 * getDependencyClosure(graph, "C");
 * // => []
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function getDependencyClosure(adjacencyList: AdjacencyList, taskId: string): string[] {
  return findAncestors(adjacencyList, taskId);
}
