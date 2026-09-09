/**
 * @module graph-algorithms
 * @description Pure-function graph algorithm library for the Task Graph application.
 *
 * All functions in this library are **pure** — they have no side effects,
 * make no database calls, and do not depend on React or any runtime state.
 * They operate exclusively on {@link AdjacencyList} and primitive data structures.
 *
 * The library covers:
 * - **Cycle detection** — validate DAG integrity before adding edges
 * - **Ancestor/descendant traversal** — find dependencies and dependents
 * - **Topological sort** — determine valid execution order
 * - **Blocked analysis** — identify which tasks are blocked and why
 * - **Unlock analysis** — predict impact of completing a task
 * - **Dependency closure** — compute transitive dependency sets
 * - **Critical path** — find the longest weighted path through the DAG
 *
 * @example
 * ```ts
 * import {
 *   detectCycle,
 *   topologicalSort,
 *   getBlockedTasks,
 *   getCriticalPath,
 * } from '@/lib/graph-algorithms';
 * ```
 */

// Types
export type { AdjacencyList, CycleDetectionResult, BlockedAnalysis, UnlockAnalysis } from './types';

// Cycle detection
export { detectCycle, validateDAG } from './cycle-detection';

// Ancestor traversal
export { findAncestors, findDirectAncestors } from './ancestors';

// Descendant traversal
export { findDescendants, findDirectDescendants, buildReverseGraph } from './descendants';

// Topological sort
export { topologicalSort } from './topological-sort';

// Blocked analysis
export { getBlockedTasks, getBlockingChain } from './blocked-analysis';

// Unlock analysis
export { getUnlockableTasks } from './unlock-analysis';

// Dependency closure
export { getDependencyClosure } from './dependency-closure';

// Critical path
export { getCriticalPath } from './critical-path';
export type { CriticalPathResult } from './critical-path';
