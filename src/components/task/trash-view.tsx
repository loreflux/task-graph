'use client';

import React, { useState } from 'react';
import type { Task } from '@/types';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RotateCcw, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TrashViewProps {
  initialTasks: Task[];
}

export function TrashView({ initialTasks }: TrashViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [targetDeleteTask, setTargetDeleteTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const refresh = async () => {
    const list = await dataAdapter.getTrashTasks();
    setTasks(list);
    // Prune selected IDs that no longer exist
    setSelectedIds((prev) => {
      const validIds = new Set(list.map((t) => t.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
      }
      return next;
    });
  };

  React.useEffect(() => {
    refresh();
    const handleDataChanged = () => {
      refresh();
    };
    window.addEventListener('task_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('task_data_changed', handleDataChanged);
    };
  }, []);

  const isAllSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < tasks.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRestore = async (id: string) => {
    const res = await dataAdapter.restoreTask(id);
    if (res.success) {
      toast.success('已恢复任务');
      refresh();
      window.dispatchEvent(new CustomEvent('task_data_changed'));
    } else {
      toast.error(res.error || '恢复任务失败');
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      let count = 0;
      for (const id of selectedIds) {
        const res = await dataAdapter.restoreTask(id);
        if (res.success) count++;
      }
      toast.success(`已成功恢复 ${count} 个任务`);
      setSelectedIds(new Set());
      await refresh();
      window.dispatchEvent(new CustomEvent('task_data_changed'));
    } catch {
      toast.error('批量恢复任务失败');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!targetDeleteTask) return;
    const res = await dataAdapter.deleteTask(targetDeleteTask.id, true);
    if (res.success) {
      toast.success('已彻底删除该任务及其关联依赖');
      refresh();
      window.dispatchEvent(new CustomEvent('task_data_changed'));
    } else {
      toast.error(res.error || '永久删除失败');
    }
  };

  const handleConfirmBatchPermanentDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    try {
      let count = 0;
      for (const id of selectedIds) {
        const res = await dataAdapter.deleteTask(id, true);
        if (res.success) count++;
      }
      toast.success(`已彻底永久删除 ${count} 个任务及其关联依赖`);
      setSelectedIds(new Set());
      setBatchDeleteConfirmOpen(false);
      await refresh();
      window.dispatchEvent(new CustomEvent('task_data_changed'));
    } catch {
      toast.error('批量永久删除失败');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">回收站</h2>
        </div>
        <p className="text-xs text-zinc-500">
          被删除的任务在此保留，可随时一键恢复，或彻底永久销毁。
        </p>
      </div>

      {/* Batch toolbar and Select All bar */}
      {tasks.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-900/40 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onCheckedChange={handleToggleSelectAll}
              size="sm"
            />
            <button
              onClick={() => handleToggleSelectAll(!isAllSelected)}
              className="text-xs font-medium text-zinc-300 hover:text-white transition"
            >
              全选
            </button>
            {selectedIds.size > 0 && (
              <span className="text-xs text-zinc-500">
                已选中 {selectedIds.size} / {tasks.length} 项
              </span>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <button
                onClick={handleBatchRestore}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
                <span>批量恢复 ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => setBatchDeleteConfirmOpen(true)}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 rounded-md border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-950/70 hover:text-red-300 transition disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>批量彻底删除 ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-900/20">
        {tasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">回收站为空</p>
          </div>
        ) : (
          tasks.map((t) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <div
                key={t.id}
                onClick={() => toggleSelect(t.id)}
                className={`flex items-center justify-between border-b border-zinc-900 px-4 py-3 text-xs transition cursor-pointer ${
                  isSelected ? 'bg-zinc-900/60' : 'hover:bg-zinc-900/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(t.id)}
                      size="sm"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className={`font-medium ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {t.title}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      删除时间: {t.deletedAt ? new Date(t.deletedAt).toLocaleString() : '未知'}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleRestore(t.id)}
                    className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>恢复</span>
                  </button>
                  <button
                    onClick={() => setTargetDeleteTask(t)}
                    className="flex items-center gap-1 rounded bg-red-950/40 px-2.5 py-1 text-red-400 hover:bg-red-950/60 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>彻底删除</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Custom Confirm Dialog for Single Permanent Deletion */}
      <ConfirmDialog
        open={!!targetDeleteTask}
        onOpenChange={(open) => !open && setTargetDeleteTask(null)}
        title="彻底删除任务"
        description={
          targetDeleteTask
            ? `确定要彻底永久删除任务 "${targetDeleteTask.title}" 吗？此操作不可撤销，系统将同时级联清理该任务所有依赖关系。`
            : ''
        }
        variant="danger"
        confirmText="彻底删除"
        cancelText="取消"
        onConfirm={handleConfirmPermanentDelete}
      />

      {/* Custom Confirm Dialog for Batch Permanent Deletion */}
      <ConfirmDialog
        open={batchDeleteConfirmOpen}
        onOpenChange={setBatchDeleteConfirmOpen}
        title="批量彻底删除"
        description={`确定要彻底永久删除选中的 ${selectedIds.size} 个任务吗？此操作不可撤销，系统将同时级联清理关联的所有拓扑依赖关系。`}
        variant="danger"
        confirmText="确认批量删除"
        cancelText="取消"
        onConfirm={handleConfirmBatchPermanentDelete}
      />
    </div>
  );
}
