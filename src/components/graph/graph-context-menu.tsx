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
  Undo2,
  ArrowRight,
  ArrowLeft,
  Palette,
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
  onUndo?: () => void;
  canUndo?: boolean;
  lastActionDesc?: string | null;
  onSpawnDependent?: (task: Task, direction: 'PREV' | 'NEXT') => void;
  onSetColor?: (taskId: string, color: string | null) => void;
  currentColor?: string | null;
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
  onUndo,
  canUndo = false,
  lastActionDesc = null,
  onSpawnDependent,
  onSetColor,
  currentColor = null,
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

    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handleClickOutside, true);
      window.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [menu.open, onClose]);

  if (!menu.open) return null;

  // Screen collision prevention: ensure menu doesn't overflow screen edges
  const menuWidth = 210;
  const menuHeight = menu.type === 'node' ? 420 : menu.type === 'edge' ? 120 : 200;

  const adjustedX =
    typeof window !== 'undefined' && menu.x + menuWidth > window.innerWidth
      ? window.innerWidth - menuWidth - 16
      : menu.x;

  const adjustedY =
    typeof window !== 'undefined' && menu.y + menuHeight > window.innerHeight
      ? window.innerHeight - menuHeight - 16
      : menu.y;

  return (
    <>
      {/* Full-screen invisible backdrop to immediately dismiss menu on blank left click */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          onClose();
        }}
      />

      <div
        ref={menuRef}
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }}
        className="fixed z-50 min-w-[200px] rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {menu.type === 'node' && menu.task ? (
          // NODE CONTEXT MENU
          <div className="space-y-0.5 text-xs text-zinc-300">
            <div className="border-b border-zinc-800/80 px-2.5 py-1.5">
              <span className="block truncate font-semibold text-zinc-100 max-w-[170px]">
                {menu.task.title}
              </span>
              <span className="text-[10px] text-zinc-500">
                #{menu.task.id.slice(0, 8)}
              </span>
            </div>

            {/* Undo option */}
            <button
              onClick={() => {
                if (canUndo && onUndo) {
                  onUndo();
                }
                onClose();
              }}
              disabled={!canUndo}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                <span>撤销操作</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">Ctrl+Z</span>
            </button>
            {canUndo && lastActionDesc && (
              <div className="px-2.5 pb-1 text-[10px] text-zinc-500 truncate max-w-[180px]">
                可撤销: {lastActionDesc}
              </div>
            )}

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

            {/* Spawning options */}
            <div className="my-1 border-t border-zinc-800/80" />
            <div className="px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              衍生时序依赖
            </div>

            <button
              onClick={() => {
                if (onSpawnDependent && menu.task) {
                  onSpawnDependent(menu.task, 'NEXT');
                }
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
              <span>衍生后续依赖任务</span>
            </button>

            <button
              onClick={() => {
                if (onSpawnDependent && menu.task) {
                  onSpawnDependent(menu.task, 'PREV');
                }
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-indigo-400" />
              <span>衍生前置依赖任务</span>
            </button>

            {/* Color Palette */}
            <div className="my-1 border-t border-zinc-800/80" />
            <div className="px-2.5 py-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 mb-1.5">
                <span className="flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  <span>色彩标记</span>
                </span>
                {currentColor && (
                  <button
                    onClick={() => {
                      if (onSetColor && menu.task) {
                        onSetColor(menu.task.id, null);
                      }
                      onClose();
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 transition"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 py-0.5">
                {[
                  { key: null, name: '默认', bg: 'bg-zinc-700 border-zinc-600' },
                  { key: 'blue', name: '蓝色', bg: 'bg-blue-500 border-blue-400' },
                  { key: 'emerald', name: '绿色', bg: 'bg-emerald-500 border-emerald-400' },
                  { key: 'amber', name: '黄色', bg: 'bg-amber-500 border-amber-400' },
                  { key: 'rose', name: '红色', bg: 'bg-rose-500 border-rose-400' },
                  { key: 'purple', name: '紫色', bg: 'bg-purple-500 border-purple-400' },
                  { key: 'cyan', name: '青色', bg: 'bg-cyan-500 border-cyan-400' },
                ].map((item) => {
                  const isSelected = (currentColor || null) === item.key;
                  return (
                    <button
                      key={item.key || 'default'}
                      type="button"
                      title={item.name}
                      onClick={() => {
                        if (onSetColor && menu.task) {
                          onSetColor(menu.task.id, item.key);
                        }
                        onClose();
                      }}
                      className={`h-4 w-4 rounded-full border ${item.bg} transition-all duration-150 hover:scale-125 flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-950 scale-110' : ''
                      }`}
                    >
                      {item.key === null && <span className="text-[8px] text-zinc-400 font-bold leading-none">×</span>}
                    </button>
                  );
                })}
              </div>
            </div>

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
              <span className="block truncate font-semibold text-zinc-100 max-w-[170px]">
                {menu.edgeLabel || '依赖关联连线'}
              </span>
              <span className="text-[10px] text-zinc-500">
                {menu.edgeId ? `#${menu.edgeId.slice(0, 8)}` : '依赖关系'}
              </span>
            </div>

            {/* Undo option */}
            <button
              onClick={() => {
                if (canUndo && onUndo) {
                  onUndo();
                }
                onClose();
              }}
              disabled={!canUndo}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                <span>撤销操作</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">Ctrl+Z</span>
            </button>
            {canUndo && lastActionDesc && (
              <div className="px-2.5 pb-1 text-[10px] text-zinc-500 truncate max-w-[180px]">
                可撤销: {lastActionDesc}
              </div>
            )}

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

            {/* Undo Button */}
            <button
              onClick={() => {
                if (canUndo && onUndo) {
                  onUndo();
                }
                onClose();
              }}
              disabled={!canUndo}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-medium">撤销操作</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">Ctrl+Z</span>
            </button>
            {canUndo && lastActionDesc && (
              <div className="px-2.5 pb-1 text-[10px] text-zinc-500 truncate max-w-[180px]">
                可撤销: {lastActionDesc}
              </div>
            )}

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
    </>
  );
}
