'use client';

import React, { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { TaskQuickCreate } from './task-quick-create';
import { BatchActionsBar } from './batch-actions-bar';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { createTaskAction } from '@/server/actions/task-actions';
import { useSelectionStore } from '@/stores/selection-store';
import { GitBranch, Plus, Check, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface TaskTreeViewProps {
  tasks: Task[];
  projectId?: string | null;
  onRefresh?: () => void;
}

export function TaskTreeView({
  tasks,
  projectId = null,
  onRefresh,
}: TaskTreeViewProps) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const { selectedIds, selectMany, clearSelection } = useSelectionStore();

  // Subtask dialog state
  const [subtaskTargetTask, setSubtaskTargetTask] = useState<Task | null>(null);

  const allTaskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const selectedCountInView = useMemo(
    () => allTaskIds.filter((id) => selectedIds.has(id)).length,
    [allTaskIds, selectedIds],
  );
  const isAllSelected = tasks.length > 0 && selectedCountInView === tasks.length;
  const isPartiallySelected = selectedCountInView > 0 && selectedCountInView < tasks.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectMany(allTaskIds);
    }
  };

  // Build tree from tasks
  const { rootNodes, childrenMap } = useMemo(() => {
    const map = new Map<string, Task[]>();
    const roots: Task[] = [];

    for (const t of tasks) {
      if (!t.parentId) {
        roots.push(t);
      } else {
        if (!map.has(t.parentId)) {
          map.set(t.parentId, []);
        }
        map.get(t.parentId)!.push(t);
      }
    }

    return { rootNodes: roots, childrenMap: map };
  }, [tasks]);

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const handleConfirmAddSubtask = async (title: string) => {
    if (!subtaskTargetTask) return;
    const res = await createTaskAction({
      title,
      parentId: subtaskTargetTask.id,
      projectId: subtaskTargetTask.projectId || projectId || null,
      status: 'TODO',
    });

    if (res.success) {
      toast.success(`已在 "${subtaskTargetTask.title}" 下添加子任务`);
      // Auto expand parent
      setExpandedMap((prev) => ({ ...prev, [subtaskTargetTask.id]: true }));
      onRefresh?.();
    } else {
      toast.error(res.error);
    }
  };

  const renderNode = (task: Task, depth: number) => {
    const children = childrenMap.get(task.id) || [];
    const hasChildren = children.length > 0;
    // Default expanded
    const isExpanded = expandedMap[task.id] !== false;

    return (
      <div key={task.id} className="flex flex-col">
        <div className="group relative flex items-center">
          <div className="flex-1">
            <TaskItem
              task={task}
              depth={depth}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggleExpand={() => toggleExpand(task.id)}
              onRefresh={onRefresh}
            />
          </div>

          {/* Quick Add Subtask Button on hover */}
          <button
            type="button"
            title="添加子任务"
            onClick={() => setSubtaskTargetTask(task)}
            className="absolute right-20 hidden items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:bg-zinc-700 group-hover:flex"
          >
            <Plus className="h-3 w-3" />
            <span>子任务</span>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      {/* Top Header */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              任务父子层级拆解树
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            悬停任务行可点击 "+子任务" 快速分解
          </span>
        </div>

        <TaskQuickCreate
          projectId={projectId}
          placeholder="创建顶层任务..."
          defaultStatus="TODO"
          onCreated={onRefresh}
        />
      </div>

      {/* Select All Bar */}
      {tasks.length > 0 && (
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
              (共 {tasks.length} 项{selectedCountInView > 0 ? `，已选中 ${selectedCountInView} 项` : ''})
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

      {/* Tree container */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-900/20">
        {rootNodes.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <GitBranch className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">暂无层级任务</p>
            <p className="mt-1 text-xs text-zinc-600">
              创建顶层任务后，即可继续向下无限拆解子任务
            </p>
          </div>
        ) : (
          rootNodes.map((root) => renderNode(root, 0))
        )}
      </div>

      <BatchActionsBar allTaskIds={allTaskIds} onRefresh={onRefresh} />

      {/* Custom Prompt Dialog for Subtask Creation */}
      <PromptDialog
        open={!!subtaskTargetTask}
        onOpenChange={(open) => !open && setSubtaskTargetTask(null)}
        title="创建子任务"
        description={
          subtaskTargetTask
            ? `在父任务 "${subtaskTargetTask.title}" 下添加分解子任务`
            : undefined
        }
        placeholder="输入子任务标题..."
        confirmText="添加子任务"
        onConfirm={handleConfirmAddSubtask}
      />
    </div>
  );
}
