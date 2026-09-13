'use client';

import React, { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { TaskQuickCreate } from './task-quick-create';
import { BatchActionsBar } from './batch-actions-bar';
import { useSelectionStore } from '@/stores/selection-store';
import { Search, Filter, CheckCircle2, Check, Minus } from 'lucide-react';

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
  const { selectedIds, selectMany, clearSelection } = useSelectionStore();

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

  const filteredTaskIds = useMemo(() => filteredTasks.map((t) => t.id), [filteredTasks]);
  const selectedCountInView = useMemo(
    () => filteredTaskIds.filter((id) => selectedIds.has(id)).length,
    [filteredTaskIds, selectedIds],
  );
  const isAllSelected = filteredTasks.length > 0 && selectedCountInView === filteredTasks.length;
  const isPartiallySelected = selectedCountInView > 0 && selectedCountInView < filteredTasks.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectMany(filteredTaskIds);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      {/* Top Controls: Search + Filter + Quick Create */}
      <div className="mb-4 space-y-4">
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

      {/* Select All Bar */}
      {filteredTasks.length > 0 && (
        <div className="mb-2 flex items-center justify-between px-2 text-xs text-zinc-400 select-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 rounded px-2 py-1 transition hover:bg-zinc-900 hover:text-zinc-200"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                  isAllSelected
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : isPartiallySelected
                      ? 'border-blue-500 bg-blue-600/30 text-blue-400'
                      : 'border-zinc-700 bg-zinc-900/80 hover:border-zinc-500'
                }`}
              >
                {isAllSelected && <Check className="h-3 w-3 stroke-[3]" />}
                {isPartiallySelected && <Minus className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="font-medium">
                {isAllSelected ? '取消全选' : '全选'}
              </span>
            </button>
            <span className="text-[11px] text-zinc-500">
              (共 {filteredTasks.length} 项{selectedCountInView > 0 ? `，已选中 ${selectedCountInView} 项` : ''})
            </span>
          </div>

          {selectedCountInView > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-[11px] text-zinc-500 transition hover:text-zinc-300"
            >
              清空选中
            </button>
          )}
        </div>
      )}

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

      <BatchActionsBar allTaskIds={filteredTaskIds} onRefresh={onRefresh} />
    </div>
  );
}
