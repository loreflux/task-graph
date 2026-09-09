import { describe, it, expect } from 'vitest';
import { timeService } from '@/domain/services/time-service';
import type { Task } from '@/types';

describe('Time Service & Scheduling Logic', () => {
  it('validates startAt and endAt order correctly', () => {
    const t0 = new Date('2026-09-10T09:00:00Z');
    const t1 = new Date('2026-09-10T11:00:00Z');

    expect(timeService.validateTimeRange(t0, t1).valid).toBe(true);
    expect(timeService.validateTimeRange(t1, t0).valid).toBe(false);
    expect(timeService.validateTimeRange(t0, null).valid).toBe(true);
    expect(timeService.validateTimeRange(null, t1).valid).toBe(true);
  });

  it('calculates duration in minutes accurately', () => {
    const start = new Date('2026-09-10T09:00:00Z');
    const end = new Date('2026-09-10T10:30:00Z');
    expect(timeService.calculateDuration(start, end)).toBe(90);
  });

  it('detects resource time window overlaps', () => {
    const existingTask: Task = {
      id: 'task-1',
      title: '系统设计',
      description: null,
      status: 'TODO',
      priority: 'HIGH',
      projectId: null,
      parentId: null,
      startAt: new Date('2026-09-10T09:30:00Z'),
      endAt: new Date('2026-09-10T11:00:00Z'),
      isAllDay: false,
      estimatedDuration: 90,
      actualDuration: null,
      sortOrder: 0,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Overlapping candidate: 10:00 to 11:30
    const candidateStart = new Date('2026-09-10T10:00:00Z');
    const candidateEnd = new Date('2026-09-10T11:30:00Z');

    const conflicts = timeService.findTimeConflicts(
      'task-2',
      candidateStart,
      candidateEnd,
      [existingTask],
    );

    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('RESOURCE_OVERLAP');
    expect(conflicts[0].conflictingTaskId).toBe('task-1');
  });

  it('detects dependency schedule precedence conflicts', () => {
    // Task A ends at 11:00
    // Task B (which depends on A) starts at 10:00 (starts BEFORE A ends!)
    const taskA: Task = {
      id: 'A',
      title: '数据库设计',
      description: null,
      status: 'TODO',
      priority: 'HIGH',
      projectId: null,
      parentId: null,
      startAt: new Date('2026-09-10T09:00:00Z'),
      endAt: new Date('2026-09-10T11:00:00Z'),
      isAllDay: false,
      estimatedDuration: 120,
      actualDuration: null,
      sortOrder: 0,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const taskB: Task = {
      id: 'B',
      title: '后端开发',
      description: null,
      status: 'TODO',
      priority: 'HIGH',
      projectId: null,
      parentId: null,
      startAt: new Date('2026-09-10T10:00:00Z'), // starts 1h before A ends!
      endAt: new Date('2026-09-10T13:00:00Z'),
      isAllDay: false,
      estimatedDuration: 180,
      actualDuration: null,
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adj = new Map<string, string[]>();
    adj.set('A', []);
    adj.set('B', ['A']); // B depends on A

    const taskMap = new Map<string, Task>([
      ['A', taskA],
      ['B', taskB],
    ]);

    const conflicts = timeService.findDependencyScheduleConflicts(
      'A',
      adj,
      taskMap,
    );

    expect(conflicts.length).toBe(1);
    expect(conflicts[0].dependentTaskId).toBe('B');
    expect(conflicts[0].lagMinutes).toBe(-60); // 60 minutes early
  });
});
