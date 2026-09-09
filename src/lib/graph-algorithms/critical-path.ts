/**
 * @module graph-algorithms/critical-path
 * @description Critical path analysis for the task dependency graph.
 *
 * The critical path is the longest path through the DAG when edges are
 * weighted by task durations. It determines the minimum total time to
 * complete all tasks, assuming unlimited parallelism for independent tasks.
 *
 * Tasks on the critical path have zero "slack" — any delay to them
 * delays the entire project. This information helps users identify
 * bottleneck tasks.
 *
 * Algorithm:
 * 1. Topologically sort the graph.
 * 2. Process nodes in topological order, computing the longest path
 *    to each node using dynamic programming.
 * 3. The node with the maximum total distance is the end of the critical path.
 * 4. Backtrack through predecessors to reconstruct the full path.
 *
 * Time complexity: O(V + E)
 * Space complexity: O(V)
 */

import type { AdjacencyList } from './types';
import { topologicalSort } from './topological-sort';
import { buildReverseGraph } from './descendants';

/**
 * Result of a critical path computation.
 */
export interface CriticalPathResult {
  /** Ordered list of task IDs forming the critical (longest) path. */
  path: string[];
  /** Sum of durations along the critical path. */
  totalDuration: number;
}

/**
 * Computes the critical path through the task dependency DAG.
 *
 * The critical path is the longest path (by sum of task durations)
 * from any source node (no dependencies) to any sink node (no dependents).
 * This represents the minimum project duration assuming tasks can be
 * parallelized wherever dependencies allow.
 *
 * @param adjacencyList - The dependency graph (must be a valid DAG).
 * @param durations - Map of task ID to its estimated duration (in any consistent unit).
 *                    Tasks not in the map are assumed to have duration 0.
 * @returns A {@link CriticalPathResult} with the path and total duration.
 *          Returns `{ path: [], totalDuration: 0 }` for empty graphs or
 *          graphs containing cycles.
 *
 * @example
 * ```ts
 * // A(3) depends on B(5) and C(2), B depends on D(4)
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B", "C"]],
 *   ["B", ["D"]],
 *   ["C", []],
 *   ["D", []],
 * ]);
 * const durations = new Map([["A", 3], ["B", 5], ["C", 2], ["D", 4]]);
 *
 * getCriticalPath(graph, durations);
 * // => { path: ["D", "B", "A"], totalDuration: 12 }
 * // D(4) → B(5) → A(3) = 12  (longer than C(2) → A(3) = 5)
 * ```
 *
 * @pure No side effects. Does not mutate the inputs.
 */
export function getCriticalPath(
  adjacencyList: AdjacencyList,
  durations: Map<string, number>,
): CriticalPathResult {
  const emptyResult: CriticalPathResult = { path: [], totalDuration: 0 };

  if (adjacencyList.size === 0) {
    return emptyResult;
  }

  // Step 1: Topological sort
  const topoOrder = topologicalSort(adjacencyList);
  if (topoOrder === null) {
    // Graph has a cycle — cannot compute critical path
    return emptyResult;
  }

  if (topoOrder.length === 0) {
    return emptyResult;
  }

  // Build reverse graph for efficient forward traversal
  // (reverseGraph.get(X) = list of tasks that depend on X)
  const reverseGraph = buildReverseGraph(adjacencyList);

  // Step 2: Dynamic programming — compute longest distance to each node.
  // dist[node] = the longest path (sum of durations) ending at `node`.
  // predecessor[node] = the node that precedes it on the longest path.
  const dist = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  // Initialize
  for (const nodeId of topoOrder) {
    const duration = durations.get(nodeId) ?? 0;
    dist.set(nodeId, duration);
    predecessor.set(nodeId, null);
  }

  // Process in topological order.
  // For each node, propagate its distance to its dependents.
  for (const nodeId of topoOrder) {
    const currentDist = dist.get(nodeId)!;
    const dependents = reverseGraph.get(nodeId) ?? [];

    for (const dependent of dependents) {
      const dependentDuration = durations.get(dependent) ?? 0;
      const candidateDist = currentDist + dependentDuration;

      if (candidateDist > (dist.get(dependent) ?? 0)) {
        dist.set(dependent, candidateDist);
        predecessor.set(dependent, nodeId);
      }
    }
  }

  // Step 3: Find the node with the maximum distance (end of critical path)
  let maxDist = 0;
  let endNode: string | null = null;

  for (const [nodeId, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endNode = nodeId;
    }
  }

  if (endNode === null) {
    return emptyResult;
  }

  // Step 4: Backtrack to reconstruct the path
  const path: string[] = [];
  let current: string | null = endNode;

  while (current !== null) {
    path.push(current);
    current = predecessor.get(current) ?? null;
  }

  path.reverse();

  return {
    path,
    totalDuration: maxDist,
  };
}
