/**
 * @module graph-algorithms/unlock-analysis
 * @description Unlock analysis for the "What would completing this task unlock?" feature.
 *
 * When a user considers completing a task, this module answers:
 * - **Direct unlocks**: Tasks where this is the ONLY remaining incomplete
 *   dependency. Completing it would immediately unblock them.
 * - **Indirect unlocks**: Tasks that would eventually become unblocked through
 *   a cascade — e.g., a directly unlocked task might be the last blocker for
 *   another task, and so on.
 *
 * This helps users prioritize which tasks to work on first by showing the
 * downstream impact of completing each task.
 */

import type { AdjacencyList, UnlockAnalysis } from './types';
import { buildReverseGraph } from './descendants';

/**
 * Analyzes what completing a given task would unlock.
 *
 * Simulates the completion of `taskId` and determines:
 * 1. **directUnlocks**: Tasks where `taskId` is the only remaining incomplete
 *    dependency. These would immediately become actionable.
 * 2. **indirectUnlocks**: Tasks that would be transitively unlocked through a
 *    cascade effect. For example, if completing task X directly unlocks task Y,
 *    and Y has no other blockers, then Y's dependents might also become unlocked.
 *
 * The simulation assumes that once a task is unlocked, it is immediately
 * "completed" for the purpose of cascade analysis. This gives a best-case
 * view of the cascade.
 *
 * @param adjacencyList - The dependency graph.
 * @param completedTaskIds - Set of currently completed task IDs.
 * @param taskId - The task hypothetically being completed.
 * @returns An {@link UnlockAnalysis} describing the direct and indirect impact.
 *
 * @example
 * ```ts
 * // A depends on [X, Y], B depends on [X], C depends on [B]
 * const graph: AdjacencyList = new Map([
 *   ["A", ["X", "Y"]],
 *   ["B", ["X"]],
 *   ["C", ["B"]],
 *   ["X", []],
 *   ["Y", []],
 * ]);
 *
 * const completed = new Set(["Y"]); // Y is already done
 * const result = getUnlockableTasks(graph, completed, "X");
 * // result.directUnlocks = ["A", "B"]
 * //   A: X was the only remaining blocker (Y is done) → directly unlocked
 * //   B: X was the only blocker → directly unlocked
 * // result.indirectUnlocks = ["C"]
 * //   C: depends on B, which just got unlocked → indirectly unlocked
 * ```
 *
 * @pure No side effects. Does not mutate the inputs.
 */
export function getUnlockableTasks(
  adjacencyList: AdjacencyList,
  completedTaskIds: Set<string>,
  taskId: string,
): UnlockAnalysis {
  // Build reverse graph: for each task, find who depends on it
  const reverseGraph = buildReverseGraph(adjacencyList);

  // Simulate completing taskId
  const simulatedCompleted = new Set(completedTaskIds);
  simulatedCompleted.add(taskId);

  // Find direct unlocks: tasks where taskId was the ONLY remaining
  // incomplete dependency
  const directUnlocks: string[] = [];
  const dependents = reverseGraph.get(taskId) ?? [];

  for (const dependent of dependents) {
    if (simulatedCompleted.has(dependent)) {
      // Already completed, skip
      continue;
    }

    const deps = adjacencyList.get(dependent) ?? [];
    const remainingBlockers = deps.filter((dep) => !simulatedCompleted.has(dep));

    if (remainingBlockers.length === 0) {
      directUnlocks.push(dependent);
    }
  }

  // Find indirect unlocks via cascade simulation using BFS.
  // Assume each directly unlocked task is also "completed" and check
  // what that unlocks, and so on.
  const indirectUnlocks: string[] = [];
  const allUnlocked = new Set<string>(directUnlocks);
  const cascadeCompleted = new Set(simulatedCompleted);

  // Mark directly unlocked tasks as "completed" for cascade
  for (const unlocked of directUnlocks) {
    cascadeCompleted.add(unlocked);
  }

  const queue = [...directUnlocks];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++]!;
    const currentDependents = reverseGraph.get(current) ?? [];

    for (const dependent of currentDependents) {
      if (cascadeCompleted.has(dependent) || allUnlocked.has(dependent)) {
        continue;
      }

      const deps = adjacencyList.get(dependent) ?? [];
      const remainingBlockers = deps.filter((dep) => !cascadeCompleted.has(dep));

      if (remainingBlockers.length === 0) {
        indirectUnlocks.push(dependent);
        allUnlocked.add(dependent);
        cascadeCompleted.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return {
    taskId,
    directUnlocks,
    indirectUnlocks,
  };
}
