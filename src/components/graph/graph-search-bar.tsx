'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Task } from '@/types';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

interface GraphSearchBarProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onHighlightNodes: (matchedIds: Set<string>, focusedId: string | null) => void;
  onFocusNode: (taskId: string) => void;
}

const EMPTY_SET = new Set<string>();

export function GraphSearchBar({
  open,
  onClose,
  tasks,
  onHighlightNodes,
  onFocusNode,
}: GraphSearchBarProps) {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter matched tasks
  const matchedTasks = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [query, tasks]);

  // Focus input when opened; reset when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setCurrentIndex(0);
    }
  }, [open]);

  // Sync highlights to parent whenever query or index changes
  useEffect(() => {
    if (!open) return;

    if (!query.trim() || matchedTasks.length === 0) {
      onHighlightNodes(EMPTY_SET, null);
      return;
    }

    const matchedSet = new Set(matchedTasks.map((t) => t.id));
    const focusedTask = matchedTasks[currentIndex] || null;
    onHighlightNodes(matchedSet, focusedTask ? focusedTask.id : null);

    if (focusedTask) {
      onFocusNode(focusedTask.id);
    }
  }, [open, query, currentIndex, matchedTasks, onHighlightNodes, onFocusNode]);

  // Keyboard navigation inside search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchedTasks.length > 0) {
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    }
  };

  const handleNext = () => {
    if (matchedTasks.length === 0) return;
    const nextIdx = (currentIndex + 1) % matchedTasks.length;
    setCurrentIndex(nextIdx);
  };

  const handlePrev = () => {
    if (matchedTasks.length === 0) return;
    const prevIdx = (currentIndex - 1 + matchedTasks.length) % matchedTasks.length;
    setCurrentIndex(prevIdx);
  };

  if (!open) return null;

  return (
    <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center pl-2 text-zinc-400">
        <Search className="h-3.5 w-3.5" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCurrentIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="在画布中搜索任务节点..."
        className="w-48 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0 sm:w-64"
      />

      {query.trim() && (
        <span className="text-[11px] font-mono text-zinc-500 px-1 select-none">
          {matchedTasks.length > 0 ? `${currentIndex + 1}/${matchedTasks.length}` : '无结果'}
        </span>
      )}

      {matchedTasks.length > 0 && (
        <div className="flex items-center gap-0.5 border-l border-zinc-800 pl-1">
          <button
            onClick={handlePrev}
            title="上一个 (Shift+Enter)"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleNext}
            title="下一个 (Enter)"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        title="关闭搜索 (Esc)"
        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
