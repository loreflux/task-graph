/**
 * @module lib/graph-layout
 * @description Layered hierarchical layout algorithm for DAG visualization.
 * Computes deterministic, collision-free X, Y coordinates for React Flow nodes,
 * with barycenter ordering to minimize edge crossings and special critical path highlighting.
 */

import type { Task, TaskRelation } from '@/types';

export interface LayoutNode {
  id: string;
  data: {
    task: Task;
    isBlocked?: boolean;
    directBlockers?: string[];
    isCriticalPath?: boolean;
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
    isCriticalPath?: boolean;
  };
}

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 50;

/**
 * Computes layered DAG positions for nodes.
 * Direction: Left-to-Right (dependencies on left, dependents on right).
 */
export function computeGraphLayout(
  tasks: Task[],
  relations: TaskRelation[],
  blockedTaskIds: Set<string> = new Set(),
  criticalPathNodeIds: Set<string> = new Set(),
  criticalEdgeIds: Set<string> = new Set(),
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  // Build adjacency:
  // In our data model: relation.sourceTaskId (dependent) DEPENDS_ON relation.targetTaskId (prerequisite/dependency).
  // Graph flow direction: predecessor (targetTaskId) -> dependent (sourceTaskId).
  const outgoing = new Map<string, string[]>(); // dependency -> dependents
  const incoming = new Map<string, string[]>(); // dependent -> dependencies

  for (const t of tasks) {
    outgoing.set(t.id, []);
    incoming.set(t.id, []);
  }

  for (const rel of relations) {
    if (taskMap.has(rel.sourceTaskId) && taskMap.has(rel.targetTaskId)) {
      outgoing.get(rel.targetTaskId)?.push(rel.sourceTaskId);
      incoming.get(rel.sourceTaskId)?.push(rel.targetTaskId);
    }
  }

  // Separate connected tasks vs isolated tasks (no edges at all)
  const connectedTasks: Task[] = [];
  const isolatedTasks: Task[] = [];

  for (const t of tasks) {
    const hasEdges =
      (outgoing.get(t.id)?.length || 0) > 0 ||
      (incoming.get(t.id)?.length || 0) > 0;
    if (hasEdges) {
      connectedTasks.push(t);
    } else {
      isolatedTasks.push(t);
    }
  }

  // 1. Calculate layer for connected nodes using longest path from any root
  const layers = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const t of connectedTasks) {
    const deps = incoming.get(t.id) ?? [];
    inDegree.set(t.id, deps.length);
  }

  // Roots among connected nodes (inDegree === 0)
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      layers.set(id, 0);
      queue.push(id);
    }
  }

  // Assign layers topologically
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

  // Handle any remaining connected nodes (e.g. cycle components)
  for (const t of connectedTasks) {
    if (!layers.has(t.id)) {
      layers.set(t.id, 0);
    }
  }

  // Group connected nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers.entries()) {
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(id);
  }

  // Sort layers
  const sortedLayerIndices = Array.from(layerGroups.keys()).sort((a, b) => a - b);

  // Position storage: id -> { x, y }
  const positions = new Map<string, { x: number; y: number }>();

  // 2. Position connected layers with Barycenter ordering
  let maxConnectedY = 0;

  for (let lIndex = 0; lIndex < sortedLayerIndices.length; lIndex++) {
    const layerNum = sortedLayerIndices[lIndex];
    const nodeIds = layerGroups.get(layerNum)!;

    // Barycenter ordering: if layer > 0, sort nodes based on average Y of predecessors
    if (lIndex > 0) {
      nodeIds.sort((a, b) => {
        const predsA = incoming.get(a) || [];
        const predsB = incoming.get(b) || [];

        const avgYA =
          predsA.length > 0
            ? predsA.reduce((sum, pId) => sum + (positions.get(pId)?.y || 0), 0) /
              predsA.length
            : 0;

        const avgYB =
          predsB.length > 0
            ? predsB.reduce((sum, pId) => sum + (positions.get(pId)?.y || 0), 0) /
              predsB.length
            : 0;

        return avgYA - avgYB;
      });
    }

    const x = layerNum * (NODE_WIDTH + HORIZONTAL_GAP) + 60;

    nodeIds.forEach((id, rowIdx) => {
      const y = rowIdx * (NODE_HEIGHT + VERTICAL_GAP) + 60;
      positions.set(id, { x, y });
      if (y + NODE_HEIGHT > maxConnectedY) {
        maxConnectedY = y + NODE_HEIGHT;
      }
    });
  }

  // 3. Position isolated nodes in a clean horizontal grid below or side-by-side
  if (isolatedTasks.length > 0) {
    const isolatedStartY =
      connectedTasks.length > 0 ? maxConnectedY + VERTICAL_GAP + 40 : 60;
    const itemsPerRow = Math.max(3, sortedLayerIndices.length || 3);

    isolatedTasks.forEach((task, idx) => {
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      const x = col * (NODE_WIDTH + HORIZONTAL_GAP) + 60;
      const y = isolatedStartY + row * (NODE_HEIGHT + VERTICAL_GAP);
      positions.set(task.id, { x, y });
    });
  }

  // 4. Assemble React Flow nodes
  const nodes: LayoutNode[] = tasks.map((task) => {
    const pos = positions.get(task.id) || { x: 60, y: 60 };
    const isBlocked = blockedTaskIds.has(task.id);
    const isCritical = criticalPathNodeIds.has(task.id);

    return {
      id: task.id,
      type: 'taskNode',
      position: pos,
      data: {
        task,
        isBlocked,
        directBlockers: incoming.get(task.id),
        isCriticalPath: isCritical,
      },
    };
  });

  // 5. Assemble React Flow edges with Critical Path styling
  const edges: LayoutEdge[] = relations
    .filter((r) => taskMap.has(r.sourceTaskId) && taskMap.has(r.targetTaskId))
    .map((r) => {
      const sourceTask = taskMap.get(r.targetTaskId); // Dependency (source in RF)
      const targetTask = taskMap.get(r.sourceTaskId); // Dependent (target in RF)
      const isSourceDone = sourceTask?.status === 'DONE';
      const isBlocking = !isSourceDone;
      const isCritical = criticalEdgeIds.has(r.id);

      if (isCritical) {
        return {
          id: r.id,
          source: r.targetTaskId,
          target: r.sourceTaskId,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#f59e0b',
            strokeWidth: 3.5,
            filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.7))',
          },
          data: {
            description: r.description ? `[关键路径] ${r.description}` : '关键链路',
            isCriticalPath: true,
          },
        };
      }

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
          isCriticalPath: false,
        },
      };
    });

  return { nodes, edges };
}
