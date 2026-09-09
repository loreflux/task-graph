import { describe, it, expect } from 'vitest';
import { exportToMermaid, exportToJson } from '@/lib/mermaid-export';
import type { Task, TaskRelation } from '@/types';

describe('Mermaid & JSON Export Library', () => {
  const createMockTask = (id: string, title: string, status: Task['status'] = 'TODO'): Task => ({
    id,
    title,
    description: '测试描述',
    status,
    priority: 'MEDIUM',
    projectId: 'p1',
    parentId: null,
    startAt: null,
    endAt: null,
    isAllDay: false,
    estimatedDuration: 60,
    actualDuration: null,
    sortOrder: 0,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const tasks: Task[] = [
    createMockTask('t1', '需求评审', 'DONE'),
    createMockTask('t2', '架构设计 (V2)', 'IN_PROGRESS'),
    createMockTask('t3', '前端开发', 'BLOCKED'),
  ];

  const relations: TaskRelation[] = [
    {
      id: 'r1',
      sourceTaskId: 't2',
      targetTaskId: 't1',
      relationType: 'DEPENDS_ON',
      description: '前置依赖',
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

  it('exports valid Mermaid flowchart with left-to-right topology and classes', () => {
    const mermaid = exportToMermaid(tasks, relations);

    // Flowchart declaration
    expect(mermaid).toContain('graph LR');

    // Node declarations with escaped titles
    expect(mermaid).toContain('node_t1["✓ 需求评审"]');
    expect(mermaid).toContain('node_t2["⏳ 架构设计 V2"]');
    expect(mermaid).toContain('node_t3["🔒 前端开发"]');

    // Class assignments
    expect(mermaid).toContain('class node_t1 done');
    expect(mermaid).toContain('class node_t2 inProgress');
    expect(mermaid).toContain('class node_t3 blocked');

    // Direction: targetTaskId (prerequisite) --> sourceTaskId (dependent)
    expect(mermaid).toContain('node_t1 -->|"前置依赖"| node_t2');
    expect(mermaid).toContain('node_t2 --> node_t3');
  });

  it('exports structured JSON data matching topology', () => {
    const jsonStr = exportToJson(tasks, relations);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.appName).toBe('Task Graph');
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.relations).toHaveLength(2);

    expect(parsed.tasks[0].id).toBe('t1');
    expect(parsed.tasks[0].status).toBe('DONE');

    expect(parsed.relations[0].prerequisiteTaskId).toBe('t1');
    expect(parsed.relations[0].dependentTaskId).toBe('t2');
  });
});
