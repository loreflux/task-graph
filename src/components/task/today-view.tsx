'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Task, TaskRelation } from '@/types';
import { useUIStore } from '@/stores/ui-store';
import { TaskListView } from './task-list-view';
import { TaskTreeView } from './task-tree-view';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { getBlockedTasks } from '@/lib/graph-algorithms/blocked-analysis';

const TaskGraphView = dynamic(
  () => import('../graph/task-graph-view').then((mod) => mod.TaskGraphView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span>正在初始化关系图谱引擎...</span>
        </div>
      </div>
    ),
  },
);

interface TodayViewProps {
  initialTasks: Task[];
  initialRelations: TaskRelation[];
  projectId?: string | null;
}

export function TodayView({
  initialTasks,
  initialRelations,
  projectId = null,
}: TodayViewProps) {
  const { currentView } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [relations, setRelations] = useState<TaskRelation[]>(initialRelations);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const [ts, rs] = await Promise.all([
        dataAdapter.getTasks({
          projectId: projectId || undefined,
          includeArchived: false,
        }),
        dataAdapter.getAllRelations(projectId || undefined),
      ]);
      setTasks(ts);
      setRelations(rs);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Automatically refresh whenever task data changes across the application
  useEffect(() => {
    const handleDataChanged = () => {
      refresh();
    };
    window.addEventListener('task_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('task_data_changed', handleDataChanged);
    };
  }, [refresh]);

  // Compute blocked IDs using pure algorithm (memoized to avoid unneeded child re-renders)
  const blockedIds = React.useMemo(() => {
    const completedIds = new Set(
      tasks.filter((t) => t.status === 'DONE').map((t) => t.id),
    );
    const adj = new Map<string, string[]>();
    for (const t of tasks) adj.set(t.id, []);
    for (const r of relations) adj.get(r.sourceTaskId)?.push(r.targetTaskId);
    const blockedAnalyses = getBlockedTasks(adj, completedIds);
    // Only tasks that are actually directly blocked by incomplete dependencies
    return new Set(
      blockedAnalyses
        .filter((b) => b.isDirectlyBlocked && b.blockedBy.length > 0)
        .map((b) => b.taskId),
    );
  }, [tasks, relations]);

  // Guard initial hydration pass to strictly match SSR output
  const activeView = mounted ? currentView : 'list';

  if (activeView === 'graph') {
    return (
      <TaskGraphView
        tasks={tasks}
        relations={relations}
        blockedTaskIds={blockedIds}
        projectId={projectId}
        onRefresh={refresh}
      />
    );
  }

  if (activeView === 'tree') {
    return (
      <TaskTreeView
        tasks={tasks}
        projectId={projectId}
        onRefresh={refresh}
      />
    );
  }

  return (
    <TaskListView
      tasks={tasks}
      projectId={projectId}
      onRefresh={refresh}
    />
  );
}
