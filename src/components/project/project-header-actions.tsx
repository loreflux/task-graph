'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectHeaderActionsProps {
  project: Project;
  stats: {
    completionRate: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueTasks: number;
  };
}

export function ProjectHeaderActions({ project, stats }: ProjectHeaderActionsProps) {
  const router = useRouter();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isArchived, setIsArchived] = useState(!!project.isArchived);

  const handleToggleArchive = async () => {
    const willArchive = !isArchived;
    const res = await dataAdapter.archiveProject(project.id, willArchive);
    if (res.success) {
      setIsArchived(willArchive);
      toast.success(willArchive ? `已归档项目 "${project.name}"` : `已恢复项目 "${project.name}"`);
      router.refresh();
    } else {
      toast.error(res.error || '归档操作失败');
    }
  };

  const handleConfirmDelete = async () => {
    const res = await dataAdapter.deleteProject(project.id);
    if (res.success) {
      toast.success(`已安全删除项目 "${project.name}"`);
      router.push('/projects');
    } else {
      toast.error(res.error || '删除项目失败');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-900/30 px-6 py-2.5 text-xs text-zinc-400">
        {/* Left Stats */}
        <div className="flex flex-wrap items-center gap-6">
          <div>
            完成率: <span className="font-semibold text-zinc-100">{stats.completionRate}%</span>
          </div>
          <div>
            进行中: <span className="font-semibold text-amber-400">{stats.inProgressTasks}</span>
          </div>
          <div>
            已阻塞: <span className="font-semibold text-red-400">{stats.blockedTasks}</span>
          </div>
          {stats.overdueTasks > 0 && (
            <div>
              已逾期: <span className="font-semibold text-rose-400">{stats.overdueTasks}</span>
            </div>
          )}
          {isArchived && (
            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              项目已归档
            </span>
          )}
        </div>

        {/* Right Project Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleArchive}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            {isArchived ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                <span>恢复项目</span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" />
                <span>归档项目</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-red-900/30 bg-red-950/20 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>删除项目</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="确认删除此项目"
        description={`确定要删除项目 "${project.name}" 吗？项目删除后，其关联的任务将被移入未分类空间，不会丢失。`}
        variant="danger"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
