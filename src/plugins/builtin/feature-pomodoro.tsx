'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { PluginContext } from '@/types/plugin';
import { Timer, Play, Pause, RotateCcw, CheckCircle, X } from 'lucide-react';

export function PomodoroComponent({
  ctx,
  onClose,
}: {
  ctx: PluginContext;
  onClose?: () => void;
}) {
  const { tasks, updateTask, showToast, playChime } = ctx;
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeTasks = tasks.filter((t) => t.status !== 'DONE' && !t.isDeleted);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();

            if (mode === 'WORK') {
              showToast('恭喜！完成 25 分钟深度专注番茄钟！', 'success');
              if (selectedTaskId) {
                const target = tasks.find((t) => t.id === selectedTaskId);
                const currentDuration = target?.actualDuration || 0;
                updateTask(selectedTaskId, {
                  actualDuration: currentDuration + 25,
                });
                showToast(`已为任务「${target?.title}」累计登记 25 分钟执行耗时`, 'info');
              }
            } else {
              showToast('休息时间结束，准备开始下一轮高效专注！', 'info');
            }

            return mode === 'WORK' ? 5 * 60 : 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, selectedTaskId, tasks, updateTask, showToast, playChime]);

  const toggleRun = () => setIsRunning(!isRunning);

  const reset = (newMode: 'WORK' | 'BREAK' = mode) => {
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === 'WORK' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl max-w-md w-full mx-auto">
      {/* Header */}
      <div className="flex w-full items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-red-400" />
          <h3 className="text-sm font-bold">极简番茄专注时钟</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mode Switches */}
      <div className="mt-4 flex gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
        <button
          onClick={() => reset('WORK')}
          className={`rounded-md px-4 py-1.5 font-medium transition ${
            mode === 'WORK' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400'
          }`}
        >
          深度专注 (25分钟)
        </button>
        <button
          onClick={() => reset('BREAK')}
          className={`rounded-md px-4 py-1.5 font-medium transition ${
            mode === 'BREAK' ? 'bg-green-500/20 text-green-400' : 'text-zinc-400'
          }`}
        >
          小憩放松 (5分钟)
        </button>
      </div>

      {/* Circular / Big Digital Timer Display */}
      <div className="my-8 text-center">
        <div className="font-mono text-6xl font-black tracking-tight text-zinc-100">
          {formattedTime}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {mode === 'WORK' ? '全神贯注，避免中断' : '伸展身心，喝口水休息'}
        </p>
      </div>

      {/* Task Linkage Picker */}
      <div className="w-full mb-6">
        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
          绑定关联推进的任务（完成后自动记入任务执行耗时）：
        </label>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none"
        >
          <option value="">-- 未指定关联任务 (自由专注) --</option>
          {activeTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {/* Control Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleRun}
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition ${
            isRunning
              ? 'bg-amber-600 text-white hover:bg-amber-500'
              : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-950/50'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" />
              <span>暂停</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>开始专注</span>
            </>
          )}
        </button>

        <button
          onClick={() => reset()}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RotateCcw className="h-4 w-4" />
          <span>重置</span>
        </button>
      </div>
    </div>
  );
}

export const featurePomodoroPlugin = {
  manifest: {
    id: 'feature-pomodoro',
    name: '极简番茄钟专注时钟',
    version: '1.0.0',
    description: '内置科学的 25 分钟番茄工作法时钟，支持绑定具体任务并在倒计时结束时自动累计实际耗时。',
    author: '官方效率组',
    category: 'feature' as const,
    icon: 'Timer',
    tags: ['功能扩展', '番茄工作法', '专注时钟', '耗时统计'],
    defaultEnabled: true,
  },
  component: PomodoroComponent,
};
