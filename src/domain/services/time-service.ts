/**
 * @module domain/services/time-service
 * @description Manages schedule reasoning, time window validity, conflict detection,
 * and dependency schedule delay propagation previews.
 */

import type { Task } from '@/types';
import type { AdjacencyList } from '@/lib/graph-algorithms/types';
import { buildReverseGraph } from '@/lib/graph-algorithms/descendants';

export interface TimeConflict {
  taskId: string;
  conflictingTaskId: string;
  conflictingTaskTitle: string;
  type: 'RESOURCE_OVERLAP' | 'DEPENDENCY_PRECEDENCE' | 'LOGICAL_ERROR';
  message: string;
}

export interface ScheduleConflict {
  dependentTaskId: string;
  dependentTitle: string;
  dependencyTaskId: string;
  dependencyTitle: string;
  dependencyEndAt: Date;
  dependentStartAt: Date;
  lagMinutes: number; // Negative if dependent starts before dependency ends
}

export interface ShiftPreview {
  originTaskId: string;
  originalEndAt: Date;
  newEndAt: Date;
  delayMinutes: number;
  affectedTasks: {
    taskId: string;
    title: string;
    originalStartAt: Date | null;
    newStartAt: Date | null;
    originalEndAt: Date | null;
    newEndAt: Date | null;
  }[];
}

export const timeService = {
  /**
   * Check logical validity of startAt and endAt.
   */
  validateTimeRange(
    startAt?: Date | null,
    endAt?: Date | null,
  ): { valid: boolean; error?: string } {
    if (!startAt || !endAt) {
      return { valid: true };
    }
    if (endAt.getTime() < startAt.getTime()) {
      return {
        valid: false,
        error: '结束时间不能早于开始时间 (endAt >= startAt)',
      };
    }
    return { valid: true };
  },

  /**
   * Calculate duration between two dates in minutes.
   */
  calculateDuration(startAt: Date, endAt: Date): number {
    const diffMs = endAt.getTime() - startAt.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60)));
  },

  /**
   * Find overlapping task schedules (resource/calendar overlap).
   */
  findTimeConflicts(
    targetTaskId: string,
    startAt: Date | null,
    endAt: Date | null,
    allTasks: Task[],
  ): TimeConflict[] {
    if (!startAt || !endAt) return [];

    const conflicts: TimeConflict[] = [];
    const targetStart = startAt.getTime();
    const targetEnd = endAt.getTime();

    for (const t of allTasks) {
      if (t.id === targetTaskId || !t.startAt || !t.endAt || t.isDeleted || t.status === 'DONE') {
        continue;
      }

      const otherStart = new Date(t.startAt).getTime();
      const otherEnd = new Date(t.endAt).getTime();

      // Overlap condition: max(start1, start2) < min(end1, end2)
      const hasOverlap = Math.max(targetStart, otherStart) < Math.min(targetEnd, otherEnd);

      if (hasOverlap) {
        conflicts.push({
          taskId: targetTaskId,
          conflictingTaskId: t.id,
          conflictingTaskTitle: t.title,
          type: 'RESOURCE_OVERLAP',
          message: `时间区间与任务 "${t.title}" 重叠 (${new Date(t.startAt).toLocaleTimeString()} ~ ${new Date(t.endAt).toLocaleTimeString()})`,
        });
      }
    }

    return conflicts;
  },

  /**
   * Check if any dependent tasks start BEFORE this task (or dependency) ends.
   */
  findDependencyScheduleConflicts(
    taskId: string,
    adjacencyList: AdjacencyList,
    taskMap: Map<string, Task>,
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const task = taskMap.get(taskId);
    if (!task || !task.endAt) return conflicts;

    const taskEnd = new Date(task.endAt).getTime();
    const reverseGraph = buildReverseGraph(adjacencyList);
    const successors = reverseGraph.get(taskId) ?? [];

    for (const succId of successors) {
      const succ = taskMap.get(succId);
      if (!succ || !succ.startAt || succ.isDeleted || succ.status === 'DONE') continue;

      const succStart = new Date(succ.startAt).getTime();
      if (succStart < taskEnd) {
        conflicts.push({
          dependentTaskId: succ.id,
          dependentTitle: succ.title,
          dependencyTaskId: task.id,
          dependencyTitle: task.title,
          dependencyEndAt: new Date(task.endAt),
          dependentStartAt: new Date(succ.startAt),
          lagMinutes: Math.round((succStart - taskEnd) / (1000 * 60)),
        });
      }
    }

    return conflicts;
  },

  /**
   * Compute schedule delay propagation preview without mutating the database.
   */
  getScheduleShiftPreview(
    taskId: string,
    newEndAt: Date,
    adjacencyList: AdjacencyList,
    taskMap: Map<string, Task>,
  ): ShiftPreview | null {
    const origin = taskMap.get(taskId);
    if (!origin || !origin.endAt) return null;

    const oldEnd = new Date(origin.endAt).getTime();
    const newEndTime = newEndAt.getTime();
    const delayMs = newEndTime - oldEnd;

    if (delayMs <= 0) {
      return {
        originTaskId: taskId,
        originalEndAt: new Date(origin.endAt),
        newEndAt,
        delayMinutes: 0,
        affectedTasks: [],
      };
    }

    const reverseGraph = buildReverseGraph(adjacencyList);
    const affected: ShiftPreview['affectedTasks'] = [];
    const visited = new Set<string>();
    const queue: { id: string; requiredStart: number }[] = [
      { id: taskId, requiredStart: newEndTime },
    ];

    while (queue.length > 0) {
      const { id: currentId, requiredStart } = queue.shift()!;
      const successors = reverseGraph.get(currentId) ?? [];

      for (const succId of successors) {
        if (visited.has(succId)) continue;
        const succ = taskMap.get(succId);
        if (!succ || succ.isDeleted || succ.status === 'DONE') continue;

        if (succ.startAt) {
          const succCurrentStart = new Date(succ.startAt).getTime();
          if (succCurrentStart < requiredStart) {
            visited.add(succId);
            const duration = succ.endAt
              ? new Date(succ.endAt).getTime() - succCurrentStart
              : 0;

            const updatedStart = new Date(requiredStart);
            const updatedEnd = succ.endAt ? new Date(requiredStart + duration) : null;

            affected.push({
              taskId: succ.id,
              title: succ.title,
              originalStartAt: new Date(succ.startAt),
              newStartAt: updatedStart,
              originalEndAt: succ.endAt ? new Date(succ.endAt) : null,
              newEndAt: updatedEnd,
            });

            if (updatedEnd) {
              queue.push({ id: succId, requiredStart: updatedEnd.getTime() });
            }
          }
        }
      }
    }

    return {
      originTaskId: taskId,
      originalEndAt: new Date(origin.endAt),
      newEndAt,
      delayMinutes: Math.round(delayMs / (1000 * 60)),
      affectedTasks: affected,
    };
  },
};
