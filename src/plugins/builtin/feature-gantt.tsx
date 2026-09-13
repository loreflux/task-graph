'use client';

import React, { useState, useMemo } from 'react';
import type { PluginContext } from '@/types/plugin';
import type { Task } from '@/types';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { CalendarRange, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export function GanttChartComponent({
  ctx,
  onClose,
}: {
  ctx: PluginContext;
  onClose?: () => void;
}) {
  const { tasks, openTaskDrawer } = ctx;
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL');

  // Filter tasks that have time bounds or assign fallback based on createdAt
  const validTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.isDeleted || t.status === 'ARCHIVED') return false;
      if (filter === 'ACTIVE' && t.status === 'DONE') return false;
      if (filter === 'DONE' && t.status !== 'DONE') return false;
      return true;
    });
  }, [tasks, filter]);

  // Compute timeline date range (min date and max date)
  const { startDate, totalDays, datesList } = useMemo(() => {
    let minTime = Date.now();
    let maxTime = Date.now() + 7 * 24 * 60 * 60 * 1000;

    for (const t of validTasks) {
      if (t.startAt) {
        const s = new Date(t.startAt).getTime();
        if (s < minTime) minTime = s;
      }
      if (t.endAt) {
        const e = new Date(t.endAt).getTime();
        if (e > maxTime) maxTime = e;
      }
    }

    // Normalize start date to 00:00
    const start = new Date(minTime);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxTime);
    end.setHours(23, 59, 59, 999);

    const days = Math.max(7, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));

    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }

    return { startDate: start, totalDays: days, datesList: dates };
  }, [validTasks]);

  return (
    <div className="flex h-full max-h-[85vh] flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">任务时序推演甘特图</h3>
            <p className="text-xs text-zinc-400">
              直观呈现项目任务的时序窗口、起止时间区间与多任务并行状态
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-xs shrink-0 whitespace-nowrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`rounded px-2.5 py-1 transition whitespace-nowrap shrink-0 ${
                filter === 'ALL' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
              }`}
            >
              全部任务
            </button>
            <button
              onClick={() => setFilter('ACTIVE')}
              className={`rounded px-2.5 py-1 transition whitespace-nowrap shrink-0 ${
                filter === 'ACTIVE' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
              }`}
            >
              仅未完成
            </button>
            <button
              onClick={() => setFilter('DONE')}
              className={`rounded px-2.5 py-1 transition whitespace-nowrap shrink-0 ${
                filter === 'DONE' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
              }`}
            >
              已完成
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Gantt Matrix */}
      <div className="mt-4 flex-1 overflow-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="min-w-[720px]">
          {/* Timeline Dates Header */}
          <div className="flex border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-400 sticky top-0 z-10">
            <div className="w-64 flex-shrink-0 p-3 border-r border-zinc-800">
              任务名称
            </div>
            <div className="flex flex-1">
              {datesList.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-[50px] border-r border-zinc-800/50 py-2.5 text-center text-[11px]"
                >
                  <span className="block font-medium text-zinc-300">
                    {d.getMonth() + 1}/{d.getDate()}
                  </span>
                  <span className="block text-[9px] text-zinc-500">
                    周{['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {validTasks.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-zinc-500">
              暂无匹配的任务数据
            </div>
          ) : (
            validTasks.map((task) => {
              const start = task.startAt ? new Date(task.startAt) : new Date(task.createdAt);
              const end = task.endAt
                ? new Date(task.endAt)
                : new Date(start.getTime() + 24 * 60 * 60 * 1000);

              const diffStartDays = Math.max(
                0,
                (start.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
              );
              const durationDays = Math.max(
                0.8,
                (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
              );

              const leftPercent = Math.min(100, (diffStartDays / totalDays) * 100);
              const widthPercent = Math.min(100 - leftPercent, (durationDays / totalDays) * 100);

              const isDone = task.status === 'DONE';
              const isBlocked = task.status === 'BLOCKED';

              return (
                <div
                  key={task.id}
                  onClick={() => openTaskDrawer(task.id)}
                  className="group flex items-center border-b border-zinc-800/40 hover:bg-zinc-800/30 cursor-pointer text-xs transition"
                >
                  {/* Task Name & Status column */}
                  <div className="w-64 flex-shrink-0 p-3 border-r border-zinc-800 flex items-center justify-between gap-2">
                    <span
                      className={`truncate font-medium ${
                        isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>

                  {/* Timeline Bar Area */}
                  <div className="relative flex-1 h-12 flex items-center px-2">
                    <div
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(4, widthPercent)}%`,
                      }}
                      className={`absolute h-6 rounded-md px-2 flex items-center text-[10px] font-medium shadow transition group-hover:brightness-110 ${
                        isDone
                          ? 'bg-green-500/30 border border-green-500/60 text-green-300'
                          : isBlocked
                          ? 'bg-red-500/30 border border-red-500/60 text-red-300'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/30 border border-amber-500/60 text-amber-300'
                          : 'bg-blue-500/30 border border-blue-500/60 text-blue-300'
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export const featureGanttPlugin = {
  manifest: {
    id: 'feature-gantt',
    name: '任务时序推演甘特图',
    version: '1.0.0',
    description: '以时间轴与进度条形式可视化排布任务的起止时间跨度，直观推演时序并行与瓶颈。',
    author: '官方工程组',
    category: 'feature' as const,
    icon: 'CalendarRange',
    tags: ['功能扩展', '甘特图', '时序分析', '项目管理'],
    defaultEnabled: true,
  },
  component: GanttChartComponent,
};
