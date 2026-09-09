/**
 * @module graph-algorithms/blocked-analysis
 * @description Analysis of blocked tasks in the dependency graph.
 *
 * A task is "blocked" when one or more of its dependencies are not yet
 * completed. This module provides two key functions:
 *
 * 1. **getBlockedTasks**: For every non-completed task, determines which
 *    dependencies are still incomplete (the "blocked by" list).
 *
 * 2. **getBlockingChain**: Traces the full recursive chain of blockers
 *    for a specific task — the "Why is this blocked?" feature. This
 *    answers questions like: "Task A is blocked by B, which is blocked
 *    by C, which is blocked by D (not completed)."
 */

import type { AdjacencyList, BlockedAnalysis } from './types';

/**
 * Analyzes all non-completed tasks to determine which are blocked
 * and what is blocking them.
 *
 * A task is considered blocked if ANY of its direct dependencies
 * are not in the `completedTaskIds` set.
 *
 * @param adjacencyList - The dependency graph.
 * @param completedTaskIds - Set of task IDs that are considered complete
 *                           (status DONE or ARCHIVED).
 * @returns An array of {@link BlockedAnalysis} for every task in the graph
 *          that is not in `completedTaskIds`. Tasks with no incomplete
 *          dependencies will have `isDirectlyBlocked: false` and an
 *          empty `blockedBy` array.
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
 * const completed = new Set(["D"]);
 * const result = getBlockedTasks(graph, completed);
 * // [
 * //   { taskId: "A", blockedBy: ["B", "C"], isDirectlyBlocked: true },
 * //   { taskId: "B", blockedBy: [], isDirectlyBlocked: false },
 * //   { taskId: "C", blockedBy: [], isDirectlyBlocked: false },
 * // ]
 * // Note: "D" is completed so it's excluded from results.
 * // "B" depends on "D" which is done, so B is not blocked.
 * // "A" depends on "B" (not done) and "C" (not done), so A is blocked.
 * ```
 *
 * @pure No side effects. Does not mutate the inputs.
 */
export function getBlockedTasks(
  adjacencyList: AdjacencyList,
  completedTaskIds: Set<string>,
): BlockedAnalysis[] {
  const results: BlockedAnalysis[] = [];

  for (const [taskId, dependencies] of adjacencyList) {
    // Skip completed tasks
    if (completedTaskIds.has(taskId)) {
      continue;
    }

    const blockedBy = dependencies.filter((dep) => !completedTaskIds.has(dep));

    results.push({
      taskId,
      blockedBy,
      isDirectlyBlocked: blockedBy.length > 0,
    });
  }

  return results;
}

/**
 * Computes the full chain of tasks blocking a given task, recursively.
 *
 * This implements the "Why Blocked?" feature. Starting from the given task,
 * it follows the dependency edges and collects every incomplete task in the
 * chain. The result is ordered from closest blocker to furthest (BFS order).
 *
 * Only incomplete tasks are included in the chain. If a dependency is
 * completed, it is not considered a blocker and its own dependencies are
 * not traversed (since completing it would not help unblock anything).
 *
 * @param adjacencyList - The dependency graph.
 * @param completedTaskIds - Set of completed task IDs.
 * @param taskId - The task to analyze.
 * @returns An ordered array of task IDs forming the blocking chain.
 *          Returns an empty array if the task is not blocked or not in the graph.
 *
 * @example
 * ```ts
 * // A depends on B, B depends on C, C depends on D
 * const graph: AdjacencyList = new Map([
 *   ["A", ["B"]],
 *   ["B", ["C"]],
 *   ["C", ["D"]],
 *   ["D", []],
 * ]);
 *
 * const completed = new Set<string>(); // nothing completed
 * getBlockingChain(graph, completed, "A");
 * // => ["B", "C", "D"]
 * // "A is blocked by B, which is blocked by C, which is blocked by D"
 * ```
 *
 * @example
 * ```ts
 * // If C is completed, D is no longer part of the chain
 * const completed2 = new Set(["C"]);
 * getBlockingChain(graph, completed2, "A");
 * // => ["B"]
 * // "A is blocked by B" (B depends on C which is done, so B is not
 * //  deeply blocked — only B itself needs to be completed)
 * ```
 *
 * @pure No side effects. Does not mutate the inputs.
 */
export function getBlockingChain(
  adjacencyList: AdjacencyList,
  completedTaskIds: Set<string>,
  taskId: string,
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Seed with direct incomplete dependencies
  const directDeps = adjacencyList.get(taskId) ?? [];
  for (const dep of directDeps) {
    if (!completedTaskIds.has(dep) && !visited.has(dep)) {
      visited.add(dep);
      queue.push(dep);
      chain.push(dep);
    }
  }

  // BFS: follow incomplete dependencies recursively
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    const deps = adjacencyList.get(current) ?? [];

    for (const dep of deps) {
      if (!completedTaskIds.has(dep) && !visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
        chain.push(dep);
      }
    }
  }

  return chain;
}
