'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { dataAdapter } from '@/lib/storage/data-adapter';
import type { Task } from '@/types';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import {
  Command,
  Search,
  Plus,
  List,
  GitBranch,
  Network,
  Inbox,
  CalendarDays,
  Archive,
  Trash2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommandPaletteProps {
  onRefresh?: () => void;
}

export function CommandPalette({ onRefresh }: CommandPaletteProps) {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentView,
    openDrawer,
  } = useUIStore();

  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      dataAdapter.getTasks({ includeArchived: false }).then(setTasks).catch(console.error);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleClose = () => {
    setCommandPaletteOpen(false);
    setQuery('');
  };

  const handleCreateTask = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const res = await dataAdapter.createTask({
      title: trimmed,
      status: 'TODO',
    });

    if (res.success) {
      toast.success(`已创建: ${trimmed}`);
      handleClose();
      onRefresh?.();
    } else {
      toast.error(res.error || '创建任务失败');
    }
  };

  // Filter tasks based on query
  const matchingTasks = query.trim()
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3">
          <Search className="mr-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleClose();
              if (e.key === 'Enter' && matchingTasks.length === 0 && query.trim()) {
                handleCreateTask();
              }
            }}
            autoFocus
            placeholder="搜索任务、输入指令，或直接按回车创建新任务..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            Esc
          </kbd>
        </div>

        {/* Command list options */}
        <div className="max-h-80 overflow-y-auto p-2 text-xs text-zinc-300">
          {/* If there's an exact search or input, show "Create" option */}
          {query.trim() && (
            <button
              onClick={handleCreateTask}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <Plus className="h-4 w-4 text-blue-400" />
              <span>
                创建新任务: <strong className="text-zinc-100">"{query.trim()}"</strong>
              </span>
            </button>
          )}

          {/* Search results */}
          {matchingTasks.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500">
                匹配的任务
              </div>
              {matchingTasks.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    openDrawer(t.id);
                    handleClose();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-zinc-400">
                    {TASK_STATUS_LABELS[t.status] || t.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* View Switches */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500">
              切换工作视图
            </div>
            <button
              onClick={() => {
                setCurrentView('list');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <List className="h-4 w-4 text-zinc-400" />
              <span>切换到 列表视图</span>
              <kbd className="ml-auto text-[10px] text-zinc-500">L</kbd>
            </button>
            <button
              onClick={() => {
                setCurrentView('tree');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <GitBranch className="h-4 w-4 text-zinc-400" />
              <span>切换到 层级树视图</span>
              <kbd className="ml-auto text-[10px] text-zinc-500">T</kbd>
            </button>
            <button
              onClick={() => {
                setCurrentView('graph');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <Network className="h-4 w-4 text-zinc-400" />
              <span>切换到 依赖关系图</span>
              <kbd className="ml-auto text-[10px] text-zinc-500">G</kbd>
            </button>
          </div>

          {/* Navigation */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500">
              快速页面跳转
            </div>
            <button
              onClick={() => {
                router.push('/');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <CalendarDays className="h-4 w-4 text-zinc-400" />
              <span>前往 "今天" 总览</span>
            </button>
            <button
              onClick={() => {
                router.push('/inbox');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <Inbox className="h-4 w-4 text-zinc-400" />
              <span>前往 "收件箱"</span>
            </button>
            <button
              onClick={() => {
                router.push('/archive');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <Archive className="h-4 w-4 text-zinc-400" />
              <span>前往 "已归档" 任务</span>
            </button>
            <button
              onClick={() => {
                router.push('/trash');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <Trash2 className="h-4 w-4 text-zinc-400" />
              <span>前往 "回收站"</span>
            </button>
            <button
              onClick={() => {
                router.push('/settings');
                handleClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 hover:text-white"
            >
              <Settings className="h-4 w-4 text-zinc-400" />
              <span>前往 "系统偏好设置"</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
