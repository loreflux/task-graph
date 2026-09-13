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
  HelpCircle,
  Search,
  Share2,
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
  onOpenSearch?: () => void;
  onOpenExport?: () => void;
  onOpenGuide?: () => void;
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
  onOpenSearch,
  onOpenExport,
  onOpenGuide,
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

      {onOpenSearch && (
        <button
          onClick={onOpenSearch}
          title="在画布中搜索任务节点 (Ctrl+F)"
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <span>搜索</span>
        </button>
      )}

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

      {onOpenExport && (
        <button
          onClick={onOpenExport}
          title="导出图谱为 Mermaid 流程图或标准 JSON 数据"
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-950/30 hover:text-emerald-300 transition"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>导出</span>
        </button>
      )}

      <div className="mx-1 h-4 w-px bg-zinc-800" />

      {onOpenGuide && (
        <button
          onClick={onOpenGuide}
          title="查看图谱画布操作指南与快捷键"
          className="flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-950/20 px-2.5 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-900/40 hover:text-blue-200"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>操作提示</span>
        </button>
      )}
    </div>
  );
}
