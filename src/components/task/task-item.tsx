'use client';

import React, { useState } from 'react';
import type { Task } from '@/types';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { formatDateTime } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useSelectionStore } from '@/stores/selection-store';
import { useSettingsStore } from '@/stores/settings-store';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { COMPLETION_STRATEGY } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Check,
  Trash2,
  Archive,
  ChevronRight,
  ChevronDown,
  Lock,
} from 'lucide-react';

interface TaskItemProps {
  task: Task;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRefresh?: () => void;
}

export function TaskItem({
  task,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  onRefresh,
}: TaskItemProps) {
  const { openDrawer } = useUIStore();
  const { isSelected, toggle } = useSelectionStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [depConfirmOpen, setDepConfirmOpen] = useState(false);
  const [secondaryWarningOpen, setSecondaryWarningOpen] = useState(false);
  const [pendingDepTasks, setPendingDepTasks] = useState<Task[]>([]);

  const selected = isSelected(task.id);
  const isDone = task.status === 'DONE';
  const isBlocked = task.status === 'BLOCKED';

  // Toggle completion with suggestion check
  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (isDone) {
        // Revert to TODO
        const res = await dataAdapter.uncompleteTask(task.id);
        if (res.success) {
          toast.success('已取消完成');
          onRefresh?.();
        } else {
          toast.error(res.error || '操作失败');
        }
      } else {
        const strategy = useSettingsStore.getState().settings.completionStrategy || 'SUGGESTION';

        if (strategy === 'STRICT') {
          // Strict Mode: complete ONLY current task without prompting
          const res = await dataAdapter.completeTask(task.id, COMPLETION_STRATEGY.SINGLE);
          if (res.success) {
            toast.success('已完成任务 (严格模式：不自动联动前置)');
            onRefresh?.();
          } else {
            toast.error(res.error || '操作失败');
          }
        } else if (strategy === 'AUTO') {
          // Auto Mode: automatically cascade complete dependencies
          const res = await dataAdapter.completeTask(task.id, COMPLETION_STRATEGY.WITH_DEPENDENCIES);
          if (res.success) {
            const count = res.data?.completed?.length || 1;
            toast.success(
              count > 1
                ? `已完成该任务及 ${count - 1} 个前置依赖 (自动模式)`
                : '已完成任务',
            );
            onRefresh?.();
          } else {
            toast.error(res.error || '操作失败');
          }
        } else {
          // Suggestion Mode (Default): check for unfinished dependencies and prompt
          const depCheck = await dataAdapter.checkUnfinishedDeps(task.id);
          if (depCheck.success && depCheck.data && depCheck.data.count > 0) {
            setPendingDepTasks(depCheck.data.tasks);
            setDepConfirmOpen(true);
          } else {
            const res = await dataAdapter.completeTask(task.id, COMPLETION_STRATEGY.SINGLE);
            if (res.success) {
              toast.success('已完成任务');
              onRefresh?.();
            } else {
              toast.error(res.error || '操作失败');
            }
          }
        }
      }
    } catch (err: any) {
      toast.error('操作失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCascadeComplete = async () => {
    setIsProcessing(true);
    try {
      const res = await dataAdapter.completeTask(
        task.id,
        COMPLETION_STRATEGY.WITH_DEPENDENCIES,
      );
      if (res.success && res.data) {
        toast.success(`已完成该任务及 ${res.data.completed.length - 1} 个前置依赖`);
        onRefresh?.();
      } else {
        toast.error(res.error || '操作失败');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteOnlyCurrent = async () => {
    setIsProcessing(true);
    try {
      const res = await dataAdapter.completeTask(task.id, COMPLETION_STRATEGY.SINGLE);
      if (res.success) {
        toast.success('已完成该任务');
        onRefresh?.();
      } else {
        toast.error(res.error || '操作失败');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const res = await dataAdapter.deleteTask(task.id);
    if (res.success) {
      toast.success('已移至回收站');
      onRefresh?.();
    } else {
      toast.error(res.error || '操作失败');
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await dataAdapter.archiveTask(task.id);
    if (res.success) {
      toast.success('已归档');
      onRefresh?.();
    } else {
      toast.error(res.error || '操作失败');
    }
  };

  return (
    <>
      <div
        data-task-item="true"
        onClick={() => openDrawer(task.id, task)}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        className={`group relative flex cursor-pointer items-center justify-between gap-3 border-b border-zinc-900/60 py-2.5 pr-3 transition hover:bg-zinc-900/40 ${
          selected ? 'bg-blue-950/20' : ''
        }`}
      >
        {/* Left side: select checkbox, tree chevron, complete button, title */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Custom Selection Checkbox */}
          <Checkbox
            size="sm"
            checked={selected}
            onCheckedChange={() => toggle(task.id)}
          />

          {/* Expand/collapse chevron for tree view */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="flex h-4 w-4 items-center justify-center text-zinc-500 hover:text-zinc-300"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Completion checkbox button */}
          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={isProcessing}
            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
              isDone
                ? 'border-green-500 bg-green-500 text-zinc-950'
                : isBlocked
                ? 'border-red-500/60 bg-red-950/20 text-red-400'
                : 'border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {isDone ? (
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            ) : isBlocked ? (
              <Lock className="h-2.5 w-2.5" />
            ) : null}
          </button>

          {/* Title and tags */}
          <span
            className={`truncate text-sm font-medium ${
              isDone
                ? 'line-through text-zinc-500'
                : isBlocked
                ? 'text-zinc-300'
                : 'text-zinc-200'
            }`}
          >
            {task.title}
          </span>
        </div>

        {/* Right side: badges, schedule, actions */}
        <div className="flex flex-shrink-0 items-center gap-3 text-xs text-zinc-500">
          <TaskPriorityBadge priority={task.priority} />
          <TaskStatusBadge status={task.status} />

          {/* Date window */}
          {(task.startAt || task.endAt) && (
            <span className="hidden text-[11px] text-zinc-500 md:inline-block">
              {task.startAt ? formatDateTime(task.startAt).slice(5) : ''}
              {task.startAt && task.endAt ? ' ~ ' : ''}
              {task.endAt ? formatDateTime(task.endAt).slice(5) : ''}
            </span>
          )}

          {/* Hover action buttons */}
          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={handleArchive}
              title="归档"
              className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmOpen(true);
              }}
              title="删除"
              className="rounded p-1 hover:bg-red-950/60 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Confirm Dialog: Delete task */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="移至回收站"
        description={`确定要将任务 "${task.title}" 移入回收站吗？之后可在回收站中随时恢复。`}
        variant="danger"
        confirmText="确认移入"
        cancelText="取消"
        onConfirm={handleDeleteConfirm}
      />

      {/* Custom Confirm Dialog: Unfinished Dependencies Suggestion Mode */}
      <ConfirmDialog
        open={depConfirmOpen}
        onOpenChange={setDepConfirmOpen}
        title="检测到未完成的前置依赖任务"
        description={`该任务尚有 ${pendingDepTasks.length} 个前置任务未完成。是否同时将这些前置依赖一并标记完成？`}
        items={pendingDepTasks.map((t) => t.title)}
        confirmText="一同完成前置依赖"
        cancelText="仅完成当前任务"
        onConfirm={handleConfirmCascadeComplete}
        onCancel={() => {
          // Trigger secondary warning modal when explicitly choosing to only complete current task
          setSecondaryWarningOpen(true);
        }}
        onClose={() => {
          setSecondaryWarningOpen(false);
        }}
      />

      {/* Secondary Warning Confirm Dialog: Strict Confirmation for Completing Only Current Task */}
      <ConfirmDialog
        open={secondaryWarningOpen}
        onOpenChange={setSecondaryWarningOpen}
        title="依赖前置未完成警告"
        description={`当前任务的前置依赖尚未执行完毕。若强行仅完成此任务，将破坏项目拓扑时序依赖逻辑。确定仍要强行完成吗？`}
        variant="danger"
        confirmText="确认强行完成"
        cancelText="返回检查"
        onConfirm={handleCompleteOnlyCurrent}
        onCancel={() => {
          setSecondaryWarningOpen(false);
        }}
      />
    </>
  );
}
