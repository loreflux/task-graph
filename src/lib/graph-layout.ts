/**
 * @module lib/graph-layout
 * @description Layered hierarchical layout algorithm for DAG visualization.
 * Computes deterministic X, Y coordinates for React Flow nodes.
 */

import type { Task, TaskRelation } from '@/types';

export interface LayoutNode {
  id: string;
  data: {
    task: Task;
    isBlocked?: boolean;
    directBlockers?: string[];
  };
  position: { x: number; y: number };
  type: string;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  data?: {
    description?: string | null;
  };
}

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 60;

/**
 * Computes layered DAG positions for nodes.
 * Direction: Left-to-Right (predecessors on the left, dependents on the right).
 */
export function computeGraphLayout(
  tasks: Task[],
  relations: TaskRelation[],
  blockedTaskIds: Set<string> = new Set(),
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  // Build incoming and outgoing adjacency
  // In our model: relation has sourceTaskId and targetTaskId
  // sourceTaskId depends on targetTaskId: targetTaskId -> sourceTaskId (predecessor to dependent)
  const outgoing = new Map<string, string[]>(); // target -> sources (who depends on target)
  const incoming = new Map<string, string[]>(); // source -> targets (who target depends on)

  for (const t of tasks) {
    outgoing.set(t.id, []);
    incoming.set(t.id, []);
  }

  for (const rel of relations) {
    if (taskMap.has(rel.sourceTaskId) && taskMap.has(rel.targetTaskId)) {
      // rel.targetTaskId is the dependency (must be done first)
      // rel.sourceTaskId is the dependent (waits for target)
      outgoing.get(rel.targetTaskId)?.push(rel.sourceTaskId);
      incoming.get(rel.sourceTaskId)?.push(rel.targetTaskId);
    }
  }

  // Calculate layer (depth from roots) for each node using longest path from any root
  const layers = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const t of tasks) {
    const deps = incoming.get(t.id) ?? [];
    inDegree.set(t.id, deps.length);
  }

  // Roots have 0 incoming edges (no dependencies)
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      layers.set(id, 0);
      queue.push(id);
    }
  }

  // Topological layer assignment
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLayer = layers.get(currentId) ?? 0;
    const successors = outgoing.get(currentId) ?? [];

    for (const succId of successors) {
      const existingLayer = layers.get(succId) ?? 0;
      layers.set(succId, Math.max(existingLayer, currentLayer + 1));

      const deg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, deg);
      if (deg === 0) {
        queue.push(succId);
      }
    }
  }

  // Handle any nodes that weren't assigned (e.g. cycle components or disconnected)
  for (const t of tasks) {
    if (!layers.has(t.id)) {
      layers.set(t.id, 0);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers.entries()) {
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(id);
  }

  // Position nodes
  const nodes: LayoutNode[] = [];
  for (const [layer, nodeIds] of layerGroups.entries()) {
    const x = layer * (NODE_WIDTH + HORIZONTAL_GAP) + 50;

    nodeIds.forEach((id, index) => {
      const y = index * (NODE_HEIGHT + VERTICAL_GAP) + 50;
      const task = taskMap.get(id)!;
      const isBlocked = blockedTaskIds.has(id);

      nodes.push({
        id,
        type: 'taskNode',
        position: { x, y },
        data: {
          task,
          isBlocked,
          directBlockers: incoming.get(id),
        },
      });
    });
  }

  // Construct React Flow edges
  // Edge goes from targetTaskId (dependency) to sourceTaskId (dependent)
  const edges: LayoutEdge[] = relations
    .filter((r) => taskMap.has(r.sourceTaskId) && taskMap.has(r.targetTaskId))
    .map((r) => {
      const sourceTask = taskMap.get(r.targetTaskId); // Dependency
      const targetTask = taskMap.get(r.sourceTaskId); // Dependent
      const isSourceDone = sourceTask?.status === 'DONE';
      const isBlocking = !isSourceDone;

      return {
        id: r.id,
        source: r.targetTaskId,
        target: r.sourceTaskId,
        type: 'smoothstep',
        animated: isBlocking,
        style: {
          stroke: isBlocking ? '#ef4444' : '#22c55e',
          strokeWidth: 2,
          strokeDasharray: isSourceDone ? '5,5' : undefined,
        },
        data: {
          description: r.description,
        },
      };
    });

  return { nodes, edges };
}
