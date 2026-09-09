'use client';

import React, { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { TaskQuickCreate } from './task-quick-create';
import { BatchActionsBar } from './batch-actions-bar';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { Inbox, CheckCircle2 } from 'lucide-react';

export function InboxView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const list = await dataAdapter.getInboxTasks();
      setTasks(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            收件箱 (Inbox 快速捕获)
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          快速记录未分类、未安排依赖的想法与临时任务，之后可打开详情细化安排。
        </p>

        <TaskQuickCreate
          defaultStatus="INBOX"
          placeholder="快速捕捉任务想法，按 Enter 记录到收件箱..."
          onCreated={refresh}
        />
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-900/20">
        {tasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">收件箱已清空</p>
            <p className="mt-1 text-xs text-zinc-600">所有任务都已整理归类</p>
          </div>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} onRefresh={refresh} />)
        )}
      </div>

      <BatchActionsBar onRefresh={refresh} />
    </div>
  );
}
