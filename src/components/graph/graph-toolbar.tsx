'use client';

import React from 'react';
import {
  Maximize2,
  LayoutGrid,
  Route,
  Lock,
  EyeOff,
  Eye,
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
}: GraphToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/90 p-1.5 shadow-xl backdrop-blur">

      <button
        onClick={onAutoLayout}
        title="自动排版 (拓扑分层布局)"
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>分层排列</span>
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
    </div>
  );
}
