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
}

export const TaskNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as TaskNodeData;
  const task = nodeData?.task;
  const isBlocked = nodeData?.isBlocked || task?.status === 'BLOCKED';
  const isDone = task?.status === 'DONE';
  const inProgress = task?.status === 'IN_PROGRESS';
  const isCritical = nodeData?.isCriticalPath;

  if (!task) return null;

  return (
    <div
      className={`relative w-[280px] rounded-xl border bg-zinc-900/95 p-3.5 shadow-lg backdrop-blur transition-all duration-200 ${
        isCritical
          ? 'border-amber-400/90 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-gradient-to-b from-amber-950/20 to-zinc-900'
          : selected
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : isBlocked
          ? 'border-red-500/60 bg-red-950/10'
          : isDone
          ? 'border-green-500/40 bg-zinc-900/60 opacity-80'
          : inProgress
          ? 'border-amber-500/60'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
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
            {TASK_STATUS_LABELS[task.status] || task.status}
          </span>
        </div>

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
