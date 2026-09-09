'use client';

import React from 'react';
import {
  Maximize2,
  LayoutGrid,
  Route,
  Lock,
  EyeOff,
  Eye,
  Sparkles,
  Undo2,
  Scissors,
} from 'lucide-react';

interface GraphToolbarProps {
  onAutoLayout: () => void;
  onFitView: () => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  showBlockedOnly: boolean;
  onToggleBlockedOnly: () => void;
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  lastActionDesc?: string | null;
}

export function GraphToolbar({
  onAutoLayout,
  onFitView,
  showCriticalPath,
  onToggleCriticalPath,
  showBlockedOnly,
  onToggleBlockedOnly,
  hideCompleted,
  onToggleHideCompleted,
  onUndo,
  canUndo = false,
  lastActionDesc = null,
}: GraphToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/90 p-1.5 shadow-xl backdrop-blur">

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title={canUndo ? `撤销上一步操作: ${lastActionDesc || ''} (Ctrl+Z)` : '暂无可撤销操作'}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <Undo2 className="h-3.5 w-3.5 text-amber-400" />
        <span>撤销</span>
      </button>

      <button
        onClick={onAutoLayout}
        title="一键拓扑整理 (根据依赖层级自动对齐重排)"
        className="flex items-center gap-1.5 rounded-md bg-blue-600/20 px-2.5 py-1.5 text-xs font-semibold text-blue-300 border border-blue-500/30 transition hover:bg-blue-600/30 hover:text-blue-100"
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        <span>一键拓扑整理</span>
      </button>

      <button
        onClick={onFitView}
        title="适应画布"
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        <span>适应视野</span>
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-800" />

      <button
        onClick={onToggleCriticalPath}
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
          showCriticalPath
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        <Route className="h-3.5 w-3.5" />
        <span>关键路径</span>
      </button>

      <button
        onClick={onToggleBlockedOnly}
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
          showBlockedOnly
            ? 'bg-red-500/20 text-red-400'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        <Lock className="h-3.5 w-3.5" />
        <span>仅看阻塞</span>
      </button>

      <button
        onClick={onToggleHideCompleted}
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
          hideCompleted
            ? 'bg-zinc-800 text-zinc-200'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        {hideCompleted ? (
          <>
            <Eye className="h-3.5 w-3.5" />
            <span>显示已完成</span>
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5" />
            <span>隐藏已完成</span>
          </>
        )}
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-800" />

      {/* Slicing tool tip */}
      <div
        title="右键按住拖拽划线：如同激光刀片般直接切断经过的依赖连线（支持 Ctrl+Z 撤销）"
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 cursor-help transition hover:text-red-300 hover:border-red-900/50"
      >
        <Scissors className="h-3 w-3 text-red-400" />
        <span className="hidden md:inline text-[11px]">右键划线断开连线</span>
      </div>
    </div>
  );
}
