'use client';

import React, { useEffect, useRef } from 'react';
import type { Task } from '@/types';
import {
  Plus,
  LayoutGrid,
  Maximize2,
  FileEdit,
  CheckCircle2,
  RotateCcw,
  GitBranch,
  Trash2,
  X,
} from 'lucide-react';

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  type: 'canvas' | 'node' | 'edge';
  task?: Task | null;
  edgeId?: string;
  edgeLabel?: string;
}

interface GraphContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onCreateTask: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
  onOpenDetail: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onAddSubtask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

export function GraphContextMenu({
  menu,
  onClose,
  onCreateTask,
  onAutoLayout,
  onFitView,
  onOpenDetail,
  onToggleStatus,
  onAddSubtask,
  onDeleteTask,
  onDeleteEdge,
}: GraphContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!menu.open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menu.open, onClose]);

  if (!menu.open) return null;

  // Screen collision prevention: ensure menu doesn't overflow screen edges
  const menuWidth = 200;
  const menuHeight = menu.type === 'node' ? 220 : menu.type === 'edge' ? 120 : 160;

  const adjustedX =
    typeof window !== 'undefined' && menu.x + menuWidth > window.innerWidth
      ? window.innerWidth - menuWidth - 16
      : menu.x;

  const adjustedY =
    typeof window !== 'undefined' && menu.y + menuHeight > window.innerHeight
      ? window.innerHeight - menuHeight - 16
      : menu.y;

  return (
    <div
      ref={menuRef}
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      className="fixed z-50 min-w-[190px] rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {menu.type === 'node' && menu.task ? (
        // NODE CONTEXT MENU
        <div className="space-y-0.5 text-xs text-zinc-300">
          <div className="border-b border-zinc-800/80 px-2.5 py-1.5">
            <span className="block truncate font-semibold text-zinc-100 max-w-[160px]">
              {menu.task.title}
            </span>
            <span className="text-[10px] text-zinc-500">
              #{menu.task.id.slice(0, 8)}
            </span>
          </div>

          <button
            onClick={() => {
              onOpenDetail(menu.task!.id);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            <FileEdit className="h-3.5 w-3.5 text-blue-400" />
            <span>查看与编辑详情</span>
          </button>

          <button
            onClick={() => {
              onToggleStatus(menu.task!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            {menu.task.status === 'DONE' ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                <span>标记为未完成</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span>标记任务为已完成</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              onAddSubtask(menu.task!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
            <span>添加分解子任务</span>
          </button>

          <div className="my-1 border-t border-zinc-800/80" />

          <button
            onClick={() => {
              onDeleteTask(menu.task!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>移入回收站</span>
          </button>
        </div>
      ) : menu.type === 'edge' ? (
        // EDGE CONTEXT MENU
        <div className="space-y-0.5 text-xs text-zinc-300">
          <div className="border-b border-zinc-800/80 px-2.5 py-1.5">
            <span className="block truncate font-semibold text-zinc-100 max-w-[160px]">
              {menu.edgeLabel || '依赖关联连线'}
            </span>
            <span className="text-[10px] text-zinc-500">
              {menu.edgeId ? `#${menu.edgeId.slice(0, 8)}` : '依赖关系'}
            </span>
          </div>

          <button
            onClick={() => {
              if (menu.edgeId && onDeleteEdge) {
                onDeleteEdge(menu.edgeId);
              }
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>删除此依赖连线</span>
          </button>
        </div>
      ) : (
        // CANVAS CONTEXT MENU
        <div className="space-y-0.5 text-xs text-zinc-300">
          <div className="border-b border-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
            画布快捷操作
          </div>

          <button
            onClick={() => {
              onCreateTask();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5 text-blue-400" />
            <span>新建任务节点</span>
          </button>

          <button
            onClick={() => {
              onAutoLayout();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
            <span>一键拓扑整理</span>
          </button>

          <button
            onClick={() => {
              onFitView();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5 text-zinc-400" />
            <span>自适应居中视野</span>
          </button>
        </div>
      )}
    </div>
  );
}
