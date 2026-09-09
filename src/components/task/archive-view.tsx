'use client';

import React, { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { BatchActionsBar } from './batch-actions-bar';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { Archive, CheckCircle2 } from 'lucide-react';

interface ArchiveViewProps {
  initialTasks: Task[];
}

export function ArchiveView({ initialTasks }: ArchiveViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const refresh = async () => {
    const list = await dataAdapter.getArchivedTasks();
    setTasks(list);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">已归档任务</h2>
        </div>
        <p className="text-xs text-zinc-500">
          归档的任务不在日常工作视图中显示，但完整的依赖与历史数据依然完整保留。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-900/20">
        {tasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">暂无归档任务</p>
          </div>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} onRefresh={refresh} />)
        )}
      </div>

      <BatchActionsBar onRefresh={refresh} />
    </div>
  );
}
