'use client';

import React from 'react';
import type { TaskStatus } from '@/types';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import {
  Circle,
  CircleDot,
  Loader,
  Lock,
  CheckCircle2,
  Archive,
} from 'lucide-react';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function TaskStatusBadge({
  status,
  size = 'sm',
  onClick,
}: TaskStatusBadgeProps) {
  const label = TASK_STATUS_LABELS[status] || status;

  const config = {
    INBOX: {
      icon: Circle,
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/60',
      border: 'border-zinc-700',
    },
    TODO: {
      icon: CircleDot,
      color: 'text-blue-400',
      bg: 'bg-blue-950/40',
      border: 'border-blue-800/50',
    },
    IN_PROGRESS: {
      icon: Loader,
      color: 'text-amber-400 animate-spin',
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/50',
    },
    BLOCKED: {
      icon: Lock,
      color: 'text-red-400',
      bg: 'bg-red-950/40',
      border: 'border-red-800/50',
    },
    DONE: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-950/40',
      border: 'border-green-800/50',
    },
    ARCHIVED: {
      icon: Archive,
      color: 'text-zinc-500',
      bg: 'bg-zinc-900',
      border: 'border-zinc-800',
    },
  }[status] || {
    icon: Circle,
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/60',
    border: 'border-zinc-700',
  };

  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition ${
        config.bg
      } ${config.border} ${
        size === 'sm' ? 'text-[11px]' : 'text-xs px-2.5 py-1'
      } ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <Icon className={`h-3 w-3 ${config.color}`} />
      <span className="text-zinc-200">{label}</span>
    </button>
  );
}
