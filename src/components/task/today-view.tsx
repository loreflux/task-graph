'use client';

import React, { useState, useEffect } from 'react';
import type { Task, TaskRelation } from '@/types';
import { useUIStore } from '@/stores/ui-store';
import { TaskListView } from './task-list-view';
import { TaskTreeView } from './task-tree-view';
import { TaskGraphView } from '../graph/task-graph-view';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { getBlockedTasks } from '@/lib/graph-algorithms/blocked-analysis';

interface TodayViewProps {
  initialTasks: Task[];
  initialRelations: TaskRelation[];
}

export function TodayView({ initialTasks, initialRelations }: TodayViewProps) {
  const { currentView } = useUIStore();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [relations, setRelations] = useState<TaskRelation[]>(initialRelations);

  const refresh = async () => {
    try {
      const [ts, rs] = await Promise.all([
        dataAdapter.getTasks({ includeArchived: false }),
        dataAdapter.getAllRelations(),
      ]);
      setTasks(ts);
      setRelations(rs);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Compute blocked IDs using pure algorithm
  const completedIds = new Set(
    tasks.filter((t) => t.status === 'DONE').map((t) => t.id),
  );
  const adj = new Map<string, string[]>();
  for (const t of tasks) adj.set(t.id, []);
  for (const r of relations) adj.get(r.sourceTaskId)?.push(r.targetTaskId);
  const blockedAnalyses = getBlockedTasks(adj, completedIds);
  const blockedIds = new Set(blockedAnalyses.map((b) => b.taskId));

  if (currentView === 'graph') {
    return (
      <TaskGraphView
        tasks={tasks}
        relations={relations}
        blockedTaskIds={blockedIds}
        onRefresh={refresh}
      />
    );
  }

  if (currentView === 'tree') {
    return <TaskTreeView tasks={tasks} onRefresh={refresh} />;
  }

  return <TaskListView tasks={tasks} onRefresh={refresh} />;
}
