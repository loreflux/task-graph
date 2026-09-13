'use client';

import React, { useState } from 'react';
import { useSelectionStore } from '@/stores/selection-store';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Check, Archive, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface BatchActionsBarProps {
  allTaskIds?: string[];
  onRefresh?: () => void;
}

export function BatchActionsBar({ allTaskIds, onRefresh }: BatchActionsBarProps) {
  const { selectedIds, selectMany, clearSelection } = useSelectionStore();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const ids = Array.from(selectedIds);
  const canSelectAll = allTaskIds && allTaskIds.length > count;

  const handleSelectAll = () => {
    if (allTaskIds) {
      selectMany(allTaskIds);
    }
  };

  const handleComplete = async () => {
    const res = await dataAdapter.batchComplete(ids);
    if (res.success) {
      toast.success(`已批量完成 ${count} 个任务`);
      clearSelection();
      onRefresh?.();
    } else {
      toast.error(res.error || '批量完成失败');
    }
  };

  const handleArchive = async () => {
    const res = await dataAdapter.batchArchive(ids);
    if (res.success) {
      toast.success(`已批量归档 ${count} 个任务`);
      clearSelection();
      onRefresh?.();
    } else {
      toast.error(res.error || '批量归档失败');
    }
  };

  const handleConfirmDelete = async () => {
    const res = await dataAdapter.batchDelete(ids);
    if (res.success) {
      toast.success(`已批量删除 ${count} 个任务`);
      clearSelection();
      onRefresh?.();
    } else {
      toast.error(res.error || '批量删除失败');
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 shadow-2xl backdrop-blur">
        <span className="text-xs font-semibold text-zinc-200">
          已选择 {count} 项
        </span>

        {canSelectAll && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-medium text-blue-400 hover:bg-zinc-700 hover:text-blue-300"
          >
            全选全部 ({allTaskIds?.length})
          </button>
        )}

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={handleComplete}
          className="flex items-center gap-1.5 rounded-lg bg-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-600/30"
        >
          <Check className="h-3.5 w-3.5" />
          <span>批量完成</span>
        </button>

        <button
          onClick={handleArchive}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
        >
          <Archive className="h-3.5 w-3.5" />
          <span>批量归档</span>
        </button>

        <button
          onClick={() => setDeleteConfirmOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>批量删除</span>
        </button>

        <button
          onClick={clearSelection}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="批量删除任务"
        description={`确定要将当前选中的 ${count} 个任务移至回收站吗？`}
        variant="danger"
        confirmText="确认批量删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
