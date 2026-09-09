/**
 * @module graph-algorithms/topological-sort
 * @description Topological sort using Kahn's algorithm.
 *
 * A topological ordering of a DAG is a linear ordering of vertices such
 * that for every directed edge u→v, u comes before v in the ordering.
 * In the task graph context, this means dependencies appear before the
 * tasks that depend on them.
 *
 * Algorithm: Kahn's Algorithm (BFS-based)
 * 1. Compute in-degree (number of dependencies) for each node.
 * 2. Enqueue all nodes with in-degree 0 (no dependencies).
 * 3. Repeatedly dequeue a node, add it to the result, and decrement
 *    the in-degree of all its dependents.
 * 4. If the result contains all nodes, the sort is valid.
 *    Otherwise, a cycle exists.
 *
 * Time complexity: O(V + E) where V = nodes, E = edges.
 * Space complexity: O(V).
 */

import type { AdjacencyList } from './types';
import { buildReverseGraph } from './descendants';

/**
 * Performs a topological sort on the dependency graph using Kahn's algorithm.
 *
 * The returned order places tasks with no dependencies first, followed by
 * tasks whose dependencies come earlier in the list. This ordering is
 * suitable for determining a valid execution sequence.
 *
 * @param adjacencyList - The dependency graph.
 * @returns An array of task IDs in topological order, or `null` if the graph
 *          contains a cycle (making topological ordering impossible).
 *          For an empty graph, returns an empty array.
 *
 * @example
 * ```ts
 * // Graph: A depends on B, B depends on C
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C"]],
 *   ["C", []],
 * ]);
 *
 * topologicalSort(graph);
 * // => ["C", "B", "A"]
 * ```
 *
 * @example
 * ```ts
 * // Graph with a cycle: A→B→C→A
 * const cyclicGraph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C"]],
 *   ["C", ["A"]],
 * ]);
 *
 * topologicalSort(cyclicGraph);
 * // => null
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function topologicalSort(adjacencyList: AdjacencyList): string[] | null {
  if (adjacencyList.size === 0) {
    return [];
  }

  // Compute in-degree for each node.
  // In our adjacency list, in-degree of a node = adjacencyList.get(node).length
  // (number of tasks it depends on).
  const inDegree = new Map<string, number>();

  for (const [nodeId, dependencies] of adjacencyList) {
    // Ensure all nodes are in the inDegree map
    if (!inDegree.has(nodeId)) {
      inDegree.set(nodeId, 0);
    }
    // Ensure dependency nodes that might not be keys are also tracked
    for (const dep of dependencies) {
      if (!inDegree.has(dep)) {
        inDegree.set(dep, 0);
      }
    }
  }

  // In-degree = number of dependencies a node has
  for (const [nodeId, dependencies] of adjacencyList) {
    inDegree.set(nodeId, dependencies.length);
  }

  // Build reverse graph to find dependents efficiently
  const reverseGraph = buildReverseGraph(adjacencyList);

  // Queue: start with all nodes that have no dependencies (in-degree 0)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++]!;
    result.push(current);

    // For each task that depends on `current`, decrement its in-degree
    const dependents = reverseGraph.get(current) ?? [];
    for (const dependent of dependents) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // If we didn't process all nodes, there's a cycle
  if (result.length !== inDegree.size) {
    return null;
  }

  return result;
}
