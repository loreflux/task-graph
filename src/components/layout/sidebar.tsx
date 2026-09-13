'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Inbox,
  FolderKanban,
  Archive,
  Trash2,
  Network,
  Plus,
  ChevronDown,
  Settings,
  X,
  Blocks,
} from 'lucide-react';
import { dataAdapter } from '@/lib/storage/data-adapter';
import type { Project } from '@/types';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ProjectContextMenu,
  type ProjectContextMenuState,
} from '@/components/project/project-context-menu';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjects, setShowProjects] = useState(true);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  // Project context menu and dialog states
  const [contextMenu, setContextMenu] = useState<ProjectContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    project: null,
  });
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const loadProjects = () => {
    dataAdapter.getProjects(false).then(setProjects).catch(console.error);
  };

  useEffect(() => {
    loadProjects();
  }, [pathname]);

  useEffect(() => {
    const handleDataChanged = () => {
      loadProjects();
    };
    window.addEventListener('task_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('task_data_changed', handleDataChanged);
    };
  }, []);

  const handleConfirmCreateProject = async (name: string) => {
    const res = await dataAdapter.createProject({ name });
    if (res.success) {
      toast.success(`项目 "${name}" 创建成功`);
      loadProjects();
    } else {
      toast.error(res.error || '创建项目失败');
    }
  };

  const handleRename = (project: Project) => {
    setRenameTarget(project);
    setRenameOpen(true);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renameTarget) return;
    const res = await dataAdapter.updateProject(renameTarget.id, { name: newName });
    if (res.success) {
      toast.success(`项目已重命名为 "${newName}"`);
      setRenameTarget(null);
      loadProjects();
    } else {
      toast.error(res.error || '重命名失败');
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const willArchive = !project.isArchived;
    const res = await dataAdapter.archiveProject(project.id, willArchive);
    if (res.success) {
      toast.success(willArchive ? `已归档项目 "${project.name}"` : `已恢复项目 "${project.name}"`);
      loadProjects();
      if (pathname === `/projects/${project.id}`) {
        router.push('/projects');
      }
    } else {
      toast.error(res.error || '归档操作失败');
    }
  };

  const handleDelete = (project: Project) => {
    setDeleteTarget(project);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await dataAdapter.deleteProject(deleteTarget.id);
    if (res.success) {
      toast.success(`已删除项目 "${deleteTarget.name}"`);
      const targetId = deleteTarget.id;
      setDeleteTarget(null);
      loadProjects();
      if (pathname === `/projects/${targetId}`) {
        router.push('/projects');
      }
    } else {
      toast.error(res.error || '删除项目失败');
    }
  };

  // Nav items without "系统设置", as settings is positioned in the bottom-left corner
  const navItems = [
    { label: '今天', href: '/', icon: CalendarDays },
    { label: '收件箱', href: '/inbox', icon: Inbox },
    { label: '项目总览', href: '/projects', icon: FolderKanban },
    { label: '插件市场', href: '/plugins', icon: Blocks },
    { label: '已归档', href: '/archive', icon: Archive },
    { label: '回收站', href: '/trash', icon: Trash2 },
  ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300 select-none">
      {/* App Branding & Mobile Close Button */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
            <Network className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight text-zinc-100 text-sm">
            任务拓扑依赖图
          </span>
        </div>
        {/* Mobile close button */}
        {isMobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-500'
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Projects Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="flex items-center gap-1 hover:text-zinc-300"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  showProjects ? '' : '-rotate-90'
                }`}
              />
              <span>项目</span>
            </button>
            <button
              onClick={() => setCreateProjectOpen(true)}
              title="新建项目"
              className="rounded p-1 hover:bg-zinc-900 hover:text-zinc-200"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {showProjects && (
            <div className="space-y-0.5">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-zinc-600">
                  暂无项目，点击上方 + 创建
                </div>
              ) : (
                projects.map((proj) => {
                  const isActive = pathname === `/projects/${proj.id}`;
                  return (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.id}`}
                      onClick={() => setMobileSidebarOpen(false)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          open: true,
                          x: e.clientX,
                          y: e.clientY,
                          project: proj,
                        });
                      }}
                      className={`relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition ${
                        isActive
                          ? 'bg-blue-600/10 font-medium text-blue-400 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r before:bg-blue-500'
                          : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: proj.color || '#3b82f6' }}
                      />
                      <span className="truncate flex-1">{proj.name}</span>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Footer: System Settings in Bottom-Left Corner & Version */}
      <div className="border-t border-zinc-800/80 p-2 space-y-1">
        <Link
          href="/settings"
          onClick={() => setMobileSidebarOpen(false)}
          className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition ${
            pathname === '/settings'
              ? 'bg-blue-600/10 text-blue-400 font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-500'
              : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
          }`}
        >
          <Settings className={`h-4 w-4 ${pathname === '/settings' ? 'text-blue-400' : 'text-zinc-400'}`} />
          <span>系统设置</span>
        </Link>
        <div className="flex items-center justify-between px-3 py-1 text-[10px] text-zinc-600">
          <span>任务拓扑图系统</span>
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-500">版本 1.0.1</span>
        </div>
      </div>

      {/* Custom Prompt Dialog for Project Creation */}
      <PromptDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        title="创建新项目"
        description="为一组相关任务设定业务项目容器"
        placeholder="例如：SSO + WuJie 微前端工程架构"
        confirmText="创建项目"
        onConfirm={handleConfirmCreateProject}
      />

      {/* Project Context Menu (Right-Click) */}
      <ProjectContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, open: false }))}
        onRename={handleRename}
        onToggleArchive={handleToggleArchive}
        onDelete={handleDelete}
      />

      {/* Rename Project Dialog */}
      <PromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="重命名项目"
        description="更新该任务拓扑项目的显示名称"
        placeholder="输入新项目名称..."
        defaultValue={renameTarget?.name || ''}
        confirmText="保存名称"
        onConfirm={handleConfirmRename}
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
    </aside>
  );
}
