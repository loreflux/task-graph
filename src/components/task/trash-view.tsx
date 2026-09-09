'use client';

import React, { useState } from 'react';
import type { Task } from '@/types';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TrashViewProps {
  initialTasks: Task[];
}

export function TrashView({ initialTasks }: TrashViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [targetDeleteTask, setTargetDeleteTask] = useState<Task | null>(null);

  const refresh = async () => {
    const list = await dataAdapter.getTrashTasks();
    setTasks(list);
  };

  const handleRestore = async (id: string) => {
    const res = await dataAdapter.restoreTask(id);
    if (res.success) {
      toast.success('已恢复任务');
      refresh();
    } else {
      toast.error(res.error || '恢复任务失败');
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!targetDeleteTask) return;
    const res = await dataAdapter.deleteTask(targetDeleteTask.id, true);
    if (res.success) {
      toast.success('已彻底删除该任务及其关联依赖');
      refresh();
    } else {
      toast.error(res.error || '永久删除失败');
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6">
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">回收站</h2>
        </div>
        <p className="text-xs text-zinc-500">
          被删除的任务在此保留，可随时一键恢复，或彻底永久销毁。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-900 bg-zinc-900/20">
        {tasks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">回收站为空</p>
          </div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-zinc-900 px-4 py-3 text-xs"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-zinc-300">{t.title}</p>
                <p className="text-[10px] text-zinc-600">
                  删除时间: {t.deletedAt ? new Date(t.deletedAt).toLocaleString() : '未知'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestore(t.id)}
                  className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-zinc-200 hover:bg-zinc-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>恢复</span>
                </button>
                <button
                  onClick={() => setTargetDeleteTask(t)}
                  className="flex items-center gap-1 rounded bg-red-950/40 px-2.5 py-1 text-red-400 hover:bg-red-950/60"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>彻底删除</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Custom Confirm Dialog for Permanent Deletion */}
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
    </div>
  );
}
