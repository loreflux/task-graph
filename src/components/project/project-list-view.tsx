'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import {
  FolderKanban,
  ArrowRight,
  Archive,
  RotateCcw,
  Trash2,
  Plus,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectListViewProps {
  initialProjects: Project[];
}

export function ProjectListView({ initialProjects }: ProjectListViewProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const refresh = async () => {
    try {
      const list = await dataAdapter.getProjects(true);
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeProjects = projects.filter((p) => !p.isArchived);
  const archivedProjects = projects.filter((p) => !!p.isArchived);
  const displayList = tab === 'ACTIVE' ? activeProjects : archivedProjects;

  const handleCreate = async (name: string) => {
    const res = await dataAdapter.createProject({ name });
    if (res.success && res.data) {
      toast.success(`项目 "${name}" 创建成功`);
      refresh();
      router.push(`/projects/${res.data.id}`);
    } else {
      toast.error(res.error || '创建项目失败');
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, p: Project) => {
    e.preventDefault();
    e.stopPropagation();
    const willArchive = !p.isArchived;
    const res = await dataAdapter.archiveProject(p.id, willArchive);
    if (res.success) {
      toast.success(willArchive ? `已归档项目 "${p.name}"` : `已恢复项目 "${p.name}"`);
      refresh();
    } else {
      toast.error(res.error || '归档操作失败');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, p: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(p);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await dataAdapter.deleteProject(deleteTarget.id);
    if (res.success) {
      toast.success(`已安全删除项目 "${deleteTarget.name}"`);
      setDeleteTarget(null);
      refresh();
    } else {
      toast.error(res.error || '删除项目失败');
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-6 md:p-8">
      {/* Top Header & Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-zinc-100">
              项目管理中心
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            按独立工程空间隔离管理任务依赖拓扑，支持归档与生命周期控制。
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
            <button
              onClick={() => setTab('ACTIVE')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                tab === 'ACTIVE'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              进行中 ({activeProjects.length})
            </button>
            <button
              onClick={() => setTab('ARCHIVED')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                tab === 'ARCHIVED'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              已归档 ({archivedProjects.length})
            </button>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>新建项目</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto">
        {displayList.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-zinc-500">
            <Layers className="mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">
              {tab === 'ACTIVE' ? '暂无进行中的项目' : '暂无归档项目'}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {tab === 'ACTIVE' ? '点击右上角 "+ 新建项目" 开启新的任务拓扑工程' : '可在进行中项目卡片上选择归档暂存'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayList.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition hover:border-zinc-700 hover:bg-zinc-900 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color || '#3b82f6' }}
                      />
                      <h3 className="font-semibold text-zinc-100 text-sm truncate">
                        {p.name}
                      </h3>
                      {p.isArchived && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                          已归档
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-500 opacity-0 transition group-hover:opacity-100 flex-shrink-0" />
                  </div>

                  {p.description && (
                    <p className="mt-2.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>创建于 {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Card Quick Actions: Archive & Delete */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      title={p.isArchived ? '恢复项目至进行中' : '归档此项目'}
                      onClick={(e) => handleToggleArchive(e, p)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400 transition"
                    >
                      {p.isArchived ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="删除项目"
                      onClick={(e) => handleDeleteClick(e, p)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Prompt Dialog */}
      <PromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="新建任务拓扑项目"
        description="为新项目命名，独立管理其任务拓扑依赖与关键路径。"
        placeholder="例如：微前端核心系统重构..."
        confirmText="立即创建"
        onConfirm={handleCreate}
      />

      {/* Delete Project Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="确认删除项目"
        description={
          deleteTarget
            ? `确定要删除项目 "${deleteTarget.name}" 吗？项目删除后，其关联的任务将解除项目归属，移至未归类空间，不会丢失。`
            : ''
        }
        variant="danger"
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
