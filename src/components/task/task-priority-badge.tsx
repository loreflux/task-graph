'use client';

import React from 'react';
import type { TaskPriority } from '@/types';
import { TASK_PRIORITY_LABELS } from '@/lib/constants';
import { Flag, ArrowUp, Minus, ArrowDown } from 'lucide-react';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
}

export function TaskPriorityBadge({
  priority,
  size = 'sm',
}: TaskPriorityBadgeProps) {
  if (priority === 'NONE') return null;

  const label = TASK_PRIORITY_LABELS[priority];

  const config = {
    URGENT: {
      icon: Flag,
      color: 'text-red-400',
      bg: 'bg-red-950/40',
      border: 'border-red-800/40',
    },
    HIGH: {
      icon: ArrowUp,
      color: 'text-orange-400',
      bg: 'bg-orange-950/40',
      border: 'border-orange-800/40',
    },
    MEDIUM: {
      icon: Minus,
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/40',
      border: 'border-yellow-800/40',
    },
    LOW: {
      icon: ArrowDown,
      color: 'text-blue-400',
      bg: 'bg-blue-950/40',
      border: 'border-blue-800/40',
    },
  }[priority];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-medium ${
        config.bg
      } ${config.border} ${config.color} ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span>{label}</span>
    </span>
  );
}
