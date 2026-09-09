'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { dataAdapter } from '@/lib/storage/data-adapter';
import type { Project } from '@/types';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';

export function Sidebar() {
  const pathname = usePathname();
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjects, setShowProjects] = useState(true);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const loadProjects = () => {
    dataAdapter.getProjects().then(setProjects).catch(console.error);
  };

  useEffect(() => {
    loadProjects();
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

  // Nav items without "系统设置", as settings is positioned in the bottom-left corner
  const navItems = [
    { label: '今天', href: '/', icon: CalendarDays },
    { label: '收件箱', href: '/inbox', icon: Inbox },
    { label: '项目总览', href: '/projects', icon: FolderKanban },
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
            Task Graph 任务图
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
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-zinc-900 text-zinc-100 font-semibold'
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
                      className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition ${
                        isActive
                          ? 'bg-zinc-900 font-medium text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: proj.color || '#3b82f6' }}
                      />
                      <span className="truncate">{proj.name}</span>
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
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition ${
            pathname === '/settings'
              ? 'bg-zinc-900 text-blue-400 font-semibold'
              : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
          }`}
        >
          <Settings className={`h-4 w-4 ${pathname === '/settings' ? 'text-blue-400' : 'text-zinc-400'}`} />
          <span>系统设置</span>
        </Link>
        <div className="flex items-center justify-between px-3 py-1 text-[10px] text-zinc-600">
          <span>Task Graph 系统</span>
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-500">v1.0</span>
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
    </aside>
  );
}
