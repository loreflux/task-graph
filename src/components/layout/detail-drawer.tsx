'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import type { TaskWithRelations, Task, TaskRelation } from '@/types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/constants';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { getBlockingChain } from '@/lib/graph-algorithms/blocked-analysis';
import { getUnlockableTasks } from '@/lib/graph-algorithms/unlock-analysis';
import { detectCycle } from '@/lib/graph-algorithms/cycle-detection';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  X,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  Plus,
  Trash2,
  Archive,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';

interface DetailDrawerProps {
  onRefresh?: () => void;
}

export function DetailDrawer({ onRefresh }: DetailDrawerProps) {
  const { selectedTaskId, isDrawerOpen, closeDrawer } = useUIStore();

  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allRelations, setAllRelations] = useState<TaskRelation[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('TODO');
  const [priority, setPriority] = useState<Task['priority']>('NONE');
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [selectedDepTarget, setSelectedDepTarget] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch full details when selectedTaskId changes
  useEffect(() => {
    if (!selectedTaskId || !isDrawerOpen) {
      setTask(null);
      return;
    }

    setLoading(true);
    Promise.all([
      dataAdapter.getTaskById(selectedTaskId),
      dataAdapter.getTasks({ includeArchived: true }),
      dataAdapter.getAllRelations(),
    ])
      .then(([t, tasksList, relationsList]) => {
        if (t) {
          setTask(t);
          setTitle(t.title);
          setDescription(t.description || '');
          setStatus(t.status);
          setPriority(t.priority);
          setStartAt(
            t.startAt ? new Date(t.startAt).toISOString().slice(0, 16) : '',
          );
          setEndAt(
            t.endAt ? new Date(t.endAt).toISOString().slice(0, 16) : '',
          );
          setEstimatedDuration(
            t.estimatedDuration ? String(t.estimatedDuration) : '',
          );
        }
        setAllTasks(tasksList);
        setAllRelations(relationsList);
      })
      .finally(() => setLoading(false));
  }, [selectedTaskId, isDrawerOpen]);

  if (!isDrawerOpen || !selectedTaskId) return null;

  // Compute graph analysis: "Why Blocked?" and "What will be unlocked?"
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const adj = new Map<string, string[]>();
  for (const t of allTasks) adj.set(t.id, []);
  for (const r of allRelations) adj.get(r.sourceTaskId)?.push(r.targetTaskId);

  const completedIds = new Set(
    allTasks.filter((t) => t.status === 'DONE').map((t) => t.id),
  );

  // Why Blocked chain
  const blockingChainIds = task
    ? getBlockingChain(adj, completedIds, task.id)
    : [];
  const blockingTasks = blockingChainIds
    .map((id) => taskMap.get(id))
    .filter(Boolean) as Task[];

  // Unlock analysis
  const unlockAnalysis = task
    ? getUnlockableTasks(adj, completedIds, task.id)
    : null;
  const directUnlocks = (unlockAnalysis?.directUnlocks || [])
    .map((id) => taskMap.get(id))
    .filter(Boolean) as Task[];
  const indirectUnlocks = (unlockAnalysis?.indirectUnlocks || [])
    .map((id) => taskMap.get(id))
    .filter(Boolean) as Task[];

  const handleSave = async () => {
    if (!task) return;

    const startDate = startAt ? new Date(startAt) : null;
    const endDate = endAt ? new Date(endAt) : null;

    if (startDate && endDate && endDate < startDate) {
      toast.error('结束时间不能早于开始时间');
      return;
    }

    const res = await dataAdapter.updateTask(task.id, {
      title,
      description: description || null,
      status,
      priority,
      startAt: startDate,
      endAt: endDate,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
    });

    if (res.success) {
      toast.success('已保存任务修改');
      onRefresh?.();
    } else {
      toast.error(res.error || '保存任务修改失败');
    }
  };

  const handleAddDependency = async () => {
    if (!task || !selectedDepTarget) return;

    if (selectedDepTarget === task.id) {
      toast.error('不能将任务依赖于自身');
      return;
    }

    const cycleCheck = detectCycle(adj, task.id, selectedDepTarget);
    if (cycleCheck.hasCycle) {
      const pathStr = cycleCheck.cyclePath ? cycleCheck.cyclePath.join(' → ') : '';
      toast.error(`无法建立依赖关系：会形成循环依赖！\n路径: ${pathStr}`);
      return;
    }

    const res = await dataAdapter.addDependency(task.id, selectedDepTarget);
    if (res.success) {
      toast.success('已添加前置依赖');
      setSelectedDepTarget('');
      // Reload drawer data
      const updated = await dataAdapter.getTaskById(task.id);
      if (updated) setTask(updated);
      onRefresh?.();
    } else {
      toast.error(res.error || '添加依赖失败');
    }
  };

  const handleRemoveDependency = async (relationId: string) => {
    if (!task) return;
    const res = await dataAdapter.removeDependency(relationId);
    if (res.success) {
      toast.success('已移除依赖');
      const updated = await dataAdapter.getTaskById(task.id);
      if (updated) setTask(updated);
      onRefresh?.();
    } else {
      toast.error(res.error || '移除依赖失败');
    }
  };

  const handleConfirmDelete = async () => {
    if (!task) return;
    const res = await dataAdapter.deleteTask(task.id);
    if (res.success) {
      toast.success('已移至回收站');
      closeDrawer();
      onRefresh?.();
    } else {
      toast.error(res.error || '移入回收站失败');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-zinc-800 bg-zinc-950/98 shadow-2xl backdrop-blur sm:w-[480px]">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>任务详情</span>
          {task?.id && <span className="font-mono text-zinc-600 text-[10px]">#{task.id.slice(0, 8)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            保存变更
          </button>
          <button
            onClick={closeDrawer}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
        {loading || !task ? (
          <div className="py-12 text-center text-xs text-zinc-500">加载详情中...</div>
        ) : (
          <>
            {/* Title Input */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">任务标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100 focus:border-zinc-600 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="添加任务备注或背景说明..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">状态</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                >
                  <option value="INBOX">收件箱</option>
                  <option value="TODO">待办</option>
                  <option value="IN_PROGRESS">进行中</option>
                  <option value="BLOCKED">已阻塞</option>
                  <option value="DONE">已完成</option>
                  <option value="ARCHIVED">已归档</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">优先级</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
                >
                  <option value="NONE">无</option>
                  <option value="LOW">低</option>
                  <option value="MEDIUM">中</option>
                  <option value="HIGH">高</option>
                  <option value="URGENT">紧急</option>
                </select>
              </div>
            </div>

            {/* Schedule Window */}
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>时间计划与耗时</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-zinc-500">开始时间</span>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500">结束时间</span>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-zinc-500">预计耗时 (分钟)</span>
                <input
                  type="number"
                  min="0"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="例如: 90"
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Why Blocked? Section (§10) */}
            {blockingTasks.length > 0 && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                  <Lock className="h-3.5 w-3.5" />
                  <span>为什么不能开始？</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  当前任务被以下尚未完成的前置依赖阻塞：
                </p>
                <div className="space-y-1.5">
                  {blockingTasks.map((bt) => (
                    <div
                      key={bt.id}
                      className="flex items-center justify-between rounded bg-red-950/40 px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      <span className="font-medium">• {bt.title}</span>
                      <span className="text-[10px] text-red-300">未完成</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What Will Be Unlocked? Section (§11) */}
            {(directUnlocks.length > 0 || indirectUnlocks.length > 0) && (
              <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                  <Unlock className="h-3.5 w-3.5" />
                  <span>完成它会解锁什么？</span>
                </div>
                <div className="text-[11px] text-zinc-300 space-y-1">
                  {directUnlocks.length > 0 && (
                    <p>
                      直接解除阻塞 ({directUnlocks.length} 个):{' '}
                      <span className="text-zinc-100 font-medium">
                        {directUnlocks.map((u) => u.title).join(', ')}
                      </span>
                    </p>
                  )}
                  {indirectUnlocks.length > 0 && (
                    <p>
                      间接推进 ({indirectUnlocks.length} 个):{' '}
                      <span className="text-zinc-400">
                        {indirectUnlocks.map((u) => u.title).join(', ')}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dependencies (DAG) */}
            <div className="space-y-3 border-t border-zinc-800/80 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  前置依赖关系 (当前任务必须等待这些先完成)
                </span>
                <span className="text-[11px] text-zinc-500">
                  {task.dependencies?.length || 0} 个前置
                </span>
              </div>

              {/* Add Dependency picker */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedDepTarget}
                  onChange={(e) => setSelectedDepTarget(e.target.value)}
                  className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="">-- 选择要依赖的任务 --</option>
                  {allTasks
                    .filter((t) => t.id !== task.id && !t.isDeleted)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({TASK_STATUS_LABELS[t.status]})
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddDependency}
                  disabled={!selectedDepTarget}
                  className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  <span>添加</span>
                </button>
              </div>

              {/* Dependency list */}
              <div className="space-y-1.5">
                {task.dependencies && task.dependencies.length > 0 ? (
                  task.dependencies.map((rel) => {
                    const depTask = taskMap.get(rel.targetTaskId);
                    return (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between rounded border border-zinc-800/60 bg-zinc-900/50 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ArrowRight className="h-3 w-3 flex-shrink-0 text-zinc-500" />
                          <span className="truncate font-medium text-zinc-200">
                            {depTask?.title || rel.targetTaskId}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            ({depTask?.status ? TASK_STATUS_LABELS[depTask.status] : ''})
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(rel.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-zinc-600">尚无前置依赖，可随时开始</p>
                )}
              </div>
            </div>

            {/* Children (Parent-Child Tree) */}
            <div className="space-y-3 border-t border-zinc-800/80 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  子任务 (父子层级拆解)
                </span>
                <span className="text-[11px] text-zinc-500">
                  {task.children?.length || 0} 个子项
                </span>
              </div>

              <div className="space-y-1">
                {task.children && task.children.length > 0 ? (
                  task.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between rounded bg-zinc-900/40 px-2.5 py-1.5 text-xs text-zinc-300"
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-3 w-3 text-zinc-500" />
                        <span>{child.title}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {TASK_STATUS_LABELS[child.status]}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-zinc-600">暂无子任务拆解</p>
                )}
              </div>
            </div>

            {/* Bottom Actions: Delete / Archive */}
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-6">
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>移至回收站</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Custom Confirm Dialog for Task Deletion */}
      {task && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="移至回收站"
          description={`确定要将任务 "${task.title}" 移入回收站吗？之后可在回收站随时恢复。`}
          variant="danger"
          confirmText="确认移入"
          cancelText="取消"
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
