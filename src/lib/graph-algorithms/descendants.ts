/**
 * @module graph-algorithms/descendants
 * @description Descendant (successor/dependent) traversal algorithms.
 *
 * In the task graph, descendants of a node are all the tasks that depend
 * on it — directly or transitively. Since the AdjacencyList stores edges
 * as "node → its dependencies", finding descendants requires reversing
 * the graph first.
 *
 * Given `map.get(A) = [B, C]` (A depends on B and C):
 * - B's descendants include A (because A depends on B)
 * - C's descendants include A (because A depends on C)
 *
 * Algorithm: BFS on the reversed graph.
 */

import type { AdjacencyList } from './types';

/**
 * Builds a reverse (transposed) adjacency list.
 *
 * In the original graph, `map.get(A) = [B]` means "A depends on B".
 * In the reversed graph, `map.get(B) = [A]` means "B is depended on by A",
 * i.e., edges point from dependency to dependent.
 *
 * @param adjacencyList - The original dependency graph.
 * @returns A new AdjacencyList with all edges reversed.
 *
 * @example
 * ```ts
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B", "C"]],
 *   ["B", ["C"]],
 *   ["C", []],
 * ]);
 *
 * const reversed = buildReverseGraph(graph);
 * // reversed = Map {
 * //   "A" => [],
 * //   "B" => ["A"],
 * //   "C" => ["A", "B"],
 * // }
 * ```
 *
 * @pure No side effects. Returns a new Map without mutating the input.
 */
export function buildReverseGraph(adjacencyList: AdjacencyList): AdjacencyList {
  const reversed: AdjacencyList = new Map();

  // Initialize all nodes with empty arrays
  for (const nodeId of adjacencyList.keys()) {
    if (!reversed.has(nodeId)) {
      reversed.set(nodeId, []);
    }
  }

  // Reverse each edge
  for (const [nodeId, dependencies] of adjacencyList) {
    for (const dep of dependencies) {
      let dependents = reversed.get(dep);
      if (!dependents) {
        dependents = [];
        reversed.set(dep, dependents);
      }
      dependents.push(nodeId);
    }
  }

  return reversed;
}

/**
 * Finds all descendants (transitive dependents) of a given task.
 *
 * Performs a BFS on the reversed graph to collect every task that
 * directly or transitively depends on the given task. The result
 * does NOT include the task itself.
 *
 * @param adjacencyList - The dependency graph.
 * @param taskId - The task whose descendants to find.
 * @returns An array of all descendant task IDs (BFS-level order).
 *          Returns an empty array if no tasks depend on this task or
 *          the task is not in the graph.
 *
 * @example
 * ```ts
 * // Graph: A → B → C  (A depends on B, B depends on C)
 * // C's descendants: B, A  (both depend on C transitively)
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C"]],
 *   ["C", []],
 * ]);
 *
 * findDescendants(graph, "C");
 * // => ["B", "A"]
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function findDescendants(adjacencyList: AdjacencyList, taskId: string): string[] {
  const reversed = buildReverseGraph(adjacencyList);
  return bfsCollect(reversed, taskId);
}

/**
 * Finds only the direct (immediate) descendants of a given task.
 *
 * These are tasks that list `taskId` as a direct dependency.
 *
 * @param adjacencyList - The dependency graph.
 * @param taskId - The task whose direct descendants to find.
 * @returns An array of task IDs that directly depend on the given task.
 *          Returns an empty array if no tasks directly depend on this task.
 *
 * @example
 * ```ts
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B", "C"]],
 *   ["B", ["C"]],
 *   ["C", []],
 * ]);
 *
 * findDirectDescendants(graph, "C");
 * // => ["A", "B"]  (both A and B directly depend on C)
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function findDirectDescendants(adjacencyList: AdjacencyList, taskId: string): string[] {
  const reversed = buildReverseGraph(adjacencyList);
  const dependents = reversed.get(taskId);
  if (!dependents) {
    return [];
  }

  // Return a defensive copy
  return [...dependents];
}

/**
 * BFS helper to collect all reachable nodes from a starting node.
 *
 * @param graph - The graph to traverse (can be original or reversed).
 * @param startId - The starting node ID.
 * @returns Array of all reachable node IDs (excluding the start node).
 */
function bfsCollect(graph: AdjacencyList, startId: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  const neighbors = graph.get(startId);
  if (!neighbors) {
    return result;
  }

  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
      result.push(neighbor);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    const nextNeighbors = graph.get(current) ?? [];

    for (const neighbor of nextNeighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        result.push(neighbor);
      }
    }
  }

  return result;
}
