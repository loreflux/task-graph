import { describe, it, expect } from 'vitest';
import { computeGraphLayout } from '@/lib/graph-layout';
import type { Task, TaskRelation } from '@/types';

describe('Graph Layout Engine', () => {
  const createMockTask = (id: string, title: string): Task => ({
    id,
    title,
    description: null,
    status: 'TODO',
    priority: 'NONE',
    projectId: null,
    parentId: null,
    startAt: null,
    endAt: null,
    isAllDay: false,
    estimatedDuration: 30,
    actualDuration: null,
    sortOrder: 0,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('assigns layers and positions properly for connected pipeline', () => {
    const tasks: Task[] = [
      createMockTask('t1', '需求分析'),
      createMockTask('t2', '系统设计'),
      createMockTask('t3', '前后端开发'),
    ];

    // t2 depends on t1; t3 depends on t2
    const relations: TaskRelation[] = [
      {
        id: 'r1',
        sourceTaskId: 't2',
        targetTaskId: 't1',
        relationType: 'DEPENDS_ON',
        description: null,
        createdAt: new Date(),
      },
      {
        id: 'r2',
        sourceTaskId: 't3',
        targetTaskId: 't2',
        relationType: 'DEPENDS_ON',
        description: null,
        createdAt: new Date(),
      },
    ];

    const { nodes, edges } = computeGraphLayout(tasks, relations);

    expect(nodes.length).toBe(3);
    expect(edges.length).toBe(2);

    const n1 = nodes.find((n) => n.id === 't1')!;
    const n2 = nodes.find((n) => n.id === 't2')!;
    const n3 = nodes.find((n) => n.id === 't3')!;

    // t1 is layer 0, t2 is layer 1, t3 is layer 2
    expect(n1.position.x).toBeLessThan(n2.position.x);
    expect(n2.position.x).toBeLessThan(n3.position.x);
  });

  it('applies critical path styling on nodes and edges', () => {
    const tasks: Task[] = [
      createMockTask('t1', '核心任务 1'),
      createMockTask('t2', '核心任务 2'),
    ];

    const relations: TaskRelation[] = [
      {
        id: 'r1',
        sourceTaskId: 't2',
        targetTaskId: 't1',
        relationType: 'DEPENDS_ON',
        description: null,
        createdAt: new Date(),
      },
    ];

    const criticalNodes = new Set(['t1', 't2']);
    const criticalEdges = new Set(['r1']);

    const { nodes, edges } = computeGraphLayout(
      tasks,
      relations,
      new Set(),
      criticalNodes,
      criticalEdges,
    );

    expect(nodes[0].data.isCriticalPath).toBe(true);
    expect(nodes[1].data.isCriticalPath).toBe(true);
    expect(edges[0].data?.isCriticalPath).toBe(true);
    expect(edges[0].style?.stroke).toBe('#f59e0b');
  });
});
