/**
 * @module graph-algorithms/ancestors
 * @description Ancestor (predecessor/dependency) traversal algorithms.
 *
 * In the task graph, ancestors of a node are all the tasks that must
 * be completed before it — its direct dependencies and their dependencies,
 * recursively.
 *
 * Given the AdjacencyList where `map.get(A) = [B, C]` means "A depends on B and C",
 * the ancestors of A are B, C, and all ancestors of B and C.
 *
 * Algorithm: Breadth-First Search (BFS) for iterative, non-recursive traversal.
 */

import type { AdjacencyList } from './types';

/**
 * Finds all ancestors (transitive dependencies) of a given task.
 *
 * Performs a BFS traversal following dependency edges to collect every task
 * that the given task transitively depends on. The result does NOT include
 * the task itself.
 *
 * @param adjacencyList - The dependency graph.
 * @param taskId - The task whose ancestors to find.
 * @returns An array of all ancestor task IDs (order is BFS-level order, not guaranteed stable).
 *          Returns an empty array if the task has no dependencies or is not in the graph.
 *
 * @example
 * ```ts
 * // Graph: A → B → C → D  (A depends on B, B on C, C on D)
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C"]],
 *   ["C", ["D"]],
 *   ["D", []],
 * ]);
 *
 * findAncestors(graph, "A");
 * // => ["B", "C", "D"]
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function findAncestors(adjacencyList: AdjacencyList, taskId: string): string[] {
  const ancestors: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Seed with direct dependencies
  const directDeps = adjacencyList.get(taskId);
  if (!directDeps) {
    return ancestors;
  }

  for (const dep of directDeps) {
    if (!visited.has(dep)) {
      visited.add(dep);
      queue.push(dep);
      ancestors.push(dep);
    }
  }

  // BFS traversal
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    const deps = adjacencyList.get(current) ?? [];

    for (const dep of deps) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
        ancestors.push(dep);
      }
    }
  }

  return ancestors;
}

/**
 * Finds only the direct (immediate) ancestors of a given task.
 *
 * These are the tasks that the given task directly depends on — i.e., the
 * values in `adjacencyList.get(taskId)`.
 *
 * @param adjacencyList - The dependency graph.
 * @param taskId - The task whose direct ancestors to find.
 * @returns An array of direct dependency task IDs.
 *          Returns an empty array if the task has no dependencies or is not in the graph.
 *
 * @example
 * ```ts
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B", "C"]],
 *   ["B", ["D"]],
 *   ["C", []],
 *   ["D", []],
 * ]);
 *
 * findDirectAncestors(graph, "A");
 * // => ["B", "C"]
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function findDirectAncestors(adjacencyList: AdjacencyList, taskId: string): string[] {
  const deps = adjacencyList.get(taskId);
  if (!deps) {
    return [];
  }

  // Return a defensive copy to maintain purity
  return [...deps];
}
