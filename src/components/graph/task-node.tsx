'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Task } from '@/types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, Lock, AlertCircle, Zap } from 'lucide-react';

interface TaskNodeData {
  task: Task;
  isBlocked?: boolean;
  directBlockers?: string[];
  isCriticalPath?: boolean;
  customColor?: string; // 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan'
  isSearchMatched?: boolean;
  isSearchFocused?: boolean;
  searchActive?: boolean;
}

const COLOR_STYLES: Record<string, string> = {
  blue: 'border-blue-500/80 bg-blue-950/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
  emerald: 'border-emerald-500/80 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
  amber: 'border-amber-500/80 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  rose: 'border-rose-500/80 bg-rose-950/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
  purple: 'border-purple-500/80 bg-purple-950/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]',
  cyan: 'border-cyan-500/80 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
};

const COLOR_DOTS: Record<string, string> = {
  blue: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
  emerald: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
  amber: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
  rose: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
  purple: 'bg-purple-500 shadow-[0_0_8px_#8b5cf6]',
  cyan: 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]',
};

export const TaskNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as TaskNodeData;
  const task = nodeData?.task;
  const isBlocked = Boolean(nodeData?.isBlocked || task?.status === 'BLOCKED');
  const hasBlockers = (nodeData?.directBlockers?.length || 0) > 0;
  const isDone = task?.status === 'DONE';
  const inProgress = task?.status === 'IN_PROGRESS';
  const isCritical = nodeData?.isCriticalPath;
  const customColor = nodeData?.customColor;
  const isSearchMatched = nodeData?.isSearchMatched;
  const isSearchFocused = nodeData?.isSearchFocused;
  const searchActive = nodeData?.searchActive;

  if (!task) return null;

  // Compute border and background styles
  let themeStyle = 'border-zinc-800 hover:border-zinc-700';
  if (isCritical) {
    themeStyle =
      'border-amber-400/90 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-gradient-to-b from-amber-950/20 to-zinc-900';
  } else if (customColor && COLOR_STYLES[customColor]) {
    themeStyle = COLOR_STYLES[customColor];
  } else if (selected) {
    themeStyle = 'border-blue-500 ring-2 ring-blue-500/30';
  } else if (isBlocked) {
    themeStyle = 'border-red-500/60 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
  } else if (isDone) {
    themeStyle = 'border-green-500/40 bg-zinc-900/60 opacity-80';
  } else if (inProgress) {
    themeStyle = 'border-amber-500/60';
  }

  // Compute search highlight classes
  let searchClasses = '';
  if (searchActive) {
    if (isSearchFocused) {
      searchClasses = 'ring-4 ring-amber-400 scale-[1.04] z-30 shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-pulse';
    } else if (isSearchMatched) {
      searchClasses = 'ring-2 ring-blue-400 scale-[1.02] z-20 shadow-[0_0_18px_rgba(96,165,250,0.5)]';
    } else {
      searchClasses = 'opacity-25 grayscale-[30%]';
    }
  }

  return (
    <div
      className={`relative w-[280px] rounded-xl border bg-zinc-900/95 p-3.5 shadow-lg backdrop-blur transition-all duration-200 ${themeStyle} ${searchClasses}`}
    >
      {/* Input Handle (Dependencies connect here from predecessor) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-zinc-900 !bg-zinc-400 hover:!bg-blue-500"
      />

      {/* Header: Status and Priority */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isCritical && (
            <span className="flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
              <Zap className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              <span>关键</span>
            </span>
          )}
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : isBlocked ? (
            <Lock className="h-4 w-4 text-red-500" />
          ) : inProgress ? (
            <Clock className="h-4 w-4 text-amber-500" />
          ) : (
            <Circle className="h-4 w-4 text-zinc-400" />
          )}
          <span
            className={`text-xs font-medium ${
              isDone
                ? 'text-green-400'
                : isBlocked
                ? 'text-red-400'
                : inProgress
                ? 'text-amber-400'
                : 'text-zinc-400'
            }`}
          >
            {isDone
              ? '已完成'
              : isBlocked
              ? '已阻塞'
              : inProgress
              ? '进行中'
              : TASK_STATUS_LABELS[task.status] || task.status}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {customColor && COLOR_DOTS[customColor] && (
            <span
              className={`inline-block h-2 w-2 rounded-full ${COLOR_DOTS[customColor]}`}
              title="色彩标记"
            />
          )}
          {task.priority && task.priority !== 'NONE' && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                task.priority === 'URGENT'
                  ? 'bg-red-500/20 text-red-400'
                  : task.priority === 'HIGH'
                  ? 'bg-orange-500/20 text-orange-400'
                  : task.priority === 'MEDIUM'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-2.5">
        <h4
          className={`text-sm font-semibold leading-tight text-zinc-100 ${
            isDone ? 'line-through text-zinc-500' : ''
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer info: Dates / Blockers */}
      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-500">
        <div>
          {task.startAt || task.endAt ? (
            <span>
              {task.startAt ? formatDateTime(task.startAt).slice(5) : ''}
              {task.startAt && task.endAt ? ' ~ ' : ''}
              {task.endAt ? formatDateTime(task.endAt).slice(5) : ''}
            </span>
          ) : (
            <span>未安排时间</span>
          )}
        </div>

        {isBlocked && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span>前置未完成</span>
          </div>
        )}
      </div>

      {/* Output Handle (Dependents connect to here) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-zinc-900 !bg-zinc-400 hover:!bg-blue-500"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
