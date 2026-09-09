/**
 * @module graph-algorithms/cycle-detection
 * @description Cycle detection algorithms for directed graphs.
 *
 * These functions ensure the task dependency graph remains a valid DAG
 * (Directed Acyclic Graph) at all times. They are designed to be called
 * **before** persisting new dependency edges.
 *
 * Algorithm: Depth-First Search (DFS) with three-color marking
 * - WHITE (unvisited): node has not been explored
 * - GRAY (in progress): node is on the current DFS path
 * - BLACK (finished): node and all its descendants are fully explored
 *
 * A back edge (encountering a GRAY node) indicates a cycle.
 */

import type { AdjacencyList, CycleDetectionResult } from './types';

/** DFS node states for cycle detection. */
const enum Color {
  WHITE = 0,
  GRAY = 1,
  BLACK = 2,
}

/**
 * Checks whether adding a dependency edge `source → target` would create a cycle.
 *
 * The edge means "source depends on target" (target must complete before source).
 * A cycle would exist if `source` is already reachable from `target` through
 * existing edges — because adding source→target would close the loop.
 *
 * @param adjacencyList - The current dependency graph (before the new edge).
 * @param sourceTaskId - The task that would gain a new dependency.
 * @param targetTaskId - The task that would become a dependency.
 * @returns A {@link CycleDetectionResult} indicating whether a cycle would form,
 *          and the path of the cycle if so.
 *
 * @example
 * ```ts
 * // Current graph: A depends on B
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", []],
 * ]);
 *
 * // Would adding B→A create a cycle?  (B depends on A)
 * const result = detectCycle(graph, "B", "A");
 * // result.hasCycle === true
 * // result.cyclePath === ["A", "B", "A"]
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function detectCycle(
  adjacencyList: AdjacencyList,
  sourceTaskId: string,
  targetTaskId: string,
): CycleDetectionResult {
  // Trivial self-loop check
  if (sourceTaskId === targetTaskId) {
    return {
      hasCycle: true,
      cyclePath: [sourceTaskId, sourceTaskId],
    };
  }

  // We need to check if `sourceTaskId` is reachable from `targetTaskId`
  // following existing dependency edges. If so, adding source→target
  // would create: target →...→ source → target (a cycle).
  //
  // We perform DFS starting from `targetTaskId`, traversing the
  // dependencies of each node (adjacencyList values).

  const visited = new Set<string>();
  const parent = new Map<string, string | null>();

  parent.set(targetTaskId, null);

  const found = dfsReachable(adjacencyList, targetTaskId, sourceTaskId, visited, parent);

  if (!found) {
    return { hasCycle: false, cyclePath: null };
  }

  // Reconstruct the cycle path: source → ... → target → source
  const cyclePath: string[] = [sourceTaskId];
  let current: string | null | undefined = targetTaskId;
  const pathSegment: string[] = [];

  while (current != null) {
    pathSegment.push(current);
    current = parent.get(current) ?? null;
  }

  // pathSegment is [target, ..., source] but parent chain goes target→...→source
  // We need: source → ... → target → source
  // pathSegment is already in reverse order from target back toward source
  // Actually let's rebuild: parent map traces target → intermediary → ... → somewhere near source

  // Reconstruct: walk from sourceTaskId backwards through parent map
  // Actually, parent map tracks the DFS from targetTaskId to sourceTaskId.
  // Path is: targetTaskId → ... → sourceTaskId  (via dependency edges)
  // Cycle is: sourceTaskId → targetTaskId → ... → sourceTaskId
  // So we reverse the pathSegment.

  pathSegment.reverse();
  // pathSegment is now [source_or_near, ..., target]
  // But the DFS started at targetTaskId, so the chain is target → ... → source
  // After reverse: source → ... → target

  // Build the full cycle path
  const fullPath = [...pathSegment, sourceTaskId];

  return {
    hasCycle: true,
    cyclePath: fullPath,
  };
}

/**
 * DFS helper to check if `target` is reachable from `current`.
 * Records parent pointers for path reconstruction.
 */
function dfsReachable(
  adjacencyList: AdjacencyList,
  current: string,
  target: string,
  visited: Set<string>,
  parent: Map<string, string | null>,
): boolean {
  if (current === target) {
    return true;
  }

  visited.add(current);

  const dependencies = adjacencyList.get(current) ?? [];
  for (const dep of dependencies) {
    if (visited.has(dep)) continue;
    parent.set(dep, current);
    if (dfsReachable(adjacencyList, dep, target, visited, parent)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that the entire graph is a valid DAG (contains no cycles).
 *
 * Uses the three-color DFS algorithm to detect back edges. If a cycle is
 * found, returns the cycle path. For disconnected graphs, all components
 * are checked.
 *
 * @param adjacencyList - The dependency graph to validate.
 * @returns A {@link CycleDetectionResult} with the first cycle found, if any.
 *
 * @example
 * ```ts
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C"]],
 *   ["C", ["A"]], // cycle!
 * ]);
 *
 * const result = validateDAG(graph);
 * // result.hasCycle === true
 * // result.cyclePath === ["A", "B", "C", "A"]  (or rotated)
 * ```
 *
 * @pure No side effects. Does not mutate the input graph.
 */
export function validateDAG(adjacencyList: AdjacencyList): CycleDetectionResult {
  // Handle empty graph
  if (adjacencyList.size === 0) {
    return { hasCycle: false, cyclePath: null };
  }

  const color = new Map<string, Color>();
  const parent = new Map<string, string | null>();

  // Initialize all nodes as WHITE
  for (const nodeId of adjacencyList.keys()) {
    color.set(nodeId, Color.WHITE);
  }

  // Run DFS from each unvisited node (handles disconnected components)
  for (const nodeId of adjacencyList.keys()) {
    if (color.get(nodeId) === Color.WHITE) {
      parent.set(nodeId, null);
      const cyclePath = dfsDetectCycle(adjacencyList, nodeId, color, parent);
      if (cyclePath) {
        return { hasCycle: true, cyclePath };
      }
    }
  }

  return { hasCycle: false, cyclePath: null };
}

/**
 * Three-color DFS that returns a cycle path if a back edge is found.
 *
 * @returns The cycle path as an array of node IDs, or null if no cycle from this node.
 */
function dfsDetectCycle(
  adjacencyList: AdjacencyList,
  nodeId: string,
  color: Map<string, Color>,
  parent: Map<string, string | null>,
): string[] | null {
  color.set(nodeId, Color.GRAY);

  const dependencies = adjacencyList.get(nodeId) ?? [];
  for (const dep of dependencies) {
    const depColor = color.get(dep);

    if (depColor === Color.GRAY) {
      // Back edge found — reconstruct the cycle
      return reconstructCycle(parent, nodeId, dep);
    }

    if (depColor === Color.WHITE || depColor === undefined) {
      parent.set(dep, nodeId);
      const cyclePath = dfsDetectCycle(adjacencyList, dep, color, parent);
      if (cyclePath) {
        return cyclePath;
      }
    }
    // BLACK nodes are fully explored, skip them
  }

  color.set(nodeId, Color.BLACK);
  return null;
}

/**
 * Reconstructs a cycle path given a back edge from `from` to `to`.
 *
 * The cycle is: to → ... → from → to
 */
function reconstructCycle(
  parent: Map<string, string | null>,
  from: string,
  to: string,
): string[] {
  const path: string[] = [to];
  let current: string | null = from;

  while (current !== null && current !== to) {
    path.push(current);
    current = parent.get(current) ?? null;
  }

  path.push(to);
  path.reverse();

  return path;
}
