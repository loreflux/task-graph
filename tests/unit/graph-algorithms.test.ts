import { describe, it, expect } from 'vitest';
import { detectCycle, validateDAG } from '@/lib/graph-algorithms/cycle-detection';
import { findAncestors, findDirectAncestors } from '@/lib/graph-algorithms/ancestors';
import { findDescendants, findDirectDescendants } from '@/lib/graph-algorithms/descendants';
import { topologicalSort } from '@/lib/graph-algorithms/topological-sort';
import { getBlockedTasks, getBlockingChain } from '@/lib/graph-algorithms/blocked-analysis';
import { getUnlockableTasks } from '@/lib/graph-algorithms/unlock-analysis';
import { getCriticalPath } from '@/lib/graph-algorithms/critical-path';

describe('Graph Algorithms (Pure Functions)', () => {
  describe('Cycle Detection', () => {
    it('detects direct cycles (A -> B -> A)', () => {
      // Graph where B depends on A
      // Key is dependent task, value is list of prerequisites it depends on
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']); // B depends on A

      // If we try to make A depend on B:
      const result = detectCycle(adj, 'A', 'B');
      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toBeDefined();
    });

    it('detects indirect cycles (A -> B -> C -> A)', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']); // B depends on A
      adj.set('C', ['B']); // C depends on B

      // If we make A depend on C:
      const result = detectCycle(adj, 'A', 'C');
      expect(result.hasCycle).toBe(true);
    });

    it('allows valid DAG edges without cycle', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']);
      adj.set('C', ['A']);

      // B depends on C? Valid
      const result = detectCycle(adj, 'B', 'C');
      expect(result.hasCycle).toBe(false);
    });

    it('rejects self-loops', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      const result = detectCycle(adj, 'A', 'A');
      expect(result.hasCycle).toBe(true);
    });
  });

  describe('Ancestors & Descendants', () => {
    it('finds all ancestors and descendants in diamond DAG', () => {
      // Diamond:
      //     A
      //    / \
      //   B   C
      //    \ /
      //     D
      // D depends on B, C. B and C depend on A.
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']);
      adj.set('C', ['A']);
      adj.set('D', ['B', 'C']);

      const ancestorsOfD = findAncestors(adj, 'D');
      expect(ancestorsOfD).toContain('A');
      expect(ancestorsOfD).toContain('B');
      expect(ancestorsOfD).toContain('C');
      expect(ancestorsOfD.length).toBe(3);

      const descendantsOfA = findDescendants(adj, 'A');
      expect(descendantsOfA).toContain('B');
      expect(descendantsOfA).toContain('C');
      expect(descendantsOfA).toContain('D');
      expect(descendantsOfA.length).toBe(3);
    });
  });

  describe('Topological Sort', () => {
    it('sorts nodes in dependency execution order', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']);
      adj.set('C', ['B']);

      const order = topologicalSort(adj);
      expect(order).not.toBeNull();
      // In topologicalSort: dependencies should appear before dependents
      // A must be before B, B before C
      const indexA = order!.indexOf('A');
      const indexB = order!.indexOf('B');
      const indexC = order!.indexOf('C');
      expect(indexA).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexC);
    });
  });

  describe('Blocked Analysis ("Why Blocked?")', () => {
    it('identifies tasks blocked by unfinished dependencies', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']); // B depends on A
      adj.set('C', ['B']); // C depends on B

      // No tasks completed
      const completed = new Set<string>();
      const blocked = getBlockedTasks(adj, completed);
      const directlyBlockedIds = blocked.filter((b) => b.isDirectlyBlocked).map((b) => b.taskId);

      expect(directlyBlockedIds).toContain('B');
      expect(directlyBlockedIds).toContain('C');
      expect(directlyBlockedIds).not.toContain('A'); // A has no dependencies, not blocked

      // Why is C blocked?
      const chain = getBlockingChain(adj, completed, 'C');
      expect(chain).toContain('B');
      expect(chain).toContain('A');
    });

    it('unblocks task when all dependencies are completed', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']);

      const completed = new Set<string>(['A']);
      const blocked = getBlockedTasks(adj, completed);
      const directlyBlockedIds = blocked.filter((b) => b.isDirectlyBlocked).map((b) => b.taskId);

      expect(directlyBlockedIds).not.toContain('B');
    });
  });

  describe('Unlock Analysis ("What Will Be Unlocked?")', () => {
    it('computes direct and indirect unlocked tasks', () => {
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']); // B depends on A
      adj.set('C', ['B']); // C depends on B

      const completed = new Set<string>();
      const unlock = getUnlockableTasks(adj, completed, 'A');

      expect(unlock.directUnlocks).toContain('B');
      expect(unlock.indirectUnlocks).toContain('C');
    });
  });

  describe('Critical Path', () => {
    it('finds longest duration path through DAG', () => {
      // Path 1: A (10) -> B (20) -> D (10) = 40
      // Path 2: A (10) -> C (5)  -> D (10) = 25
      const adj = new Map<string, string[]>();
      adj.set('A', []);
      adj.set('B', ['A']);
      adj.set('C', ['A']);
      adj.set('D', ['B', 'C']);

      const durations = new Map<string, number>();
      durations.set('A', 10);
      durations.set('B', 20);
      durations.set('C', 5);
      durations.set('D', 10);

      const result = getCriticalPath(adj, durations);
      expect(result.totalDuration).toBe(40);
      expect(result.path).toEqual(['A', 'B', 'D']);
    });
  });
});
