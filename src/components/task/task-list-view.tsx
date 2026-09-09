'use client';

import React, { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { TaskQuickCreate } from './task-quick-create';
import { BatchActionsBar } from './batch-actions-bar';
import { Search, Filter, CheckCircle2 } from 'lucide-react';

interface TaskListViewProps {
  tasks: Task[];
  projectId?: string | null;
  onRefresh?: () => void;
}

export function TaskListView({
  tasks,
  projectId = null,
  onRefresh,
}: TaskListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE') {
          if (t.status === 'DONE' || t.status === 'ARCHIVED') return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      {/* Top Controls: Search + Filter + Quick Create */}
      <div className="mb-6 space-y-4">
        <TaskQuickCreate
          projectId={projectId}
          defaultStatus="TODO"
          onCreated={onRefresh}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索任务..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="ALL">全部状态</option>
              <option value="ACTIVE">进行中与未完成</option>
              <option value="TODO">待办</option>
              <option value="IN_PROGRESS">进行中</option>
              <option value="BLOCKED">已阻塞</option>
              <option value="DONE">已完成</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="ALL">全部优先级</option>
              <option value="URGENT">紧急</option>
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List items */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-900/20">
        {filteredTasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">没有匹配的任务</p>
            <p className="mt-1 text-xs text-zinc-600">
              使用上方输入框快速创建新任务
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} onRefresh={onRefresh} />
          ))
        )}
      </div>

      <BatchActionsBar onRefresh={onRefresh} />
    </div>
  );
}
