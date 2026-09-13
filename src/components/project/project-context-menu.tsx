'use client';

import React, { useEffect, useRef } from 'react';
import type { Project } from '@/types';
import {
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export interface ProjectContextMenuState {
  open: boolean;
  x: number;
  y: number;
  project: Project | null;
}

interface ProjectContextMenuProps {
  menu: ProjectContextMenuState;
  onClose: () => void;
  onRename: (project: Project) => void;
  onToggleArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectContextMenu({
  menu,
  onClose,
  onRename,
  onToggleArchive,
  onDelete,
}: ProjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!menu.open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  if (!menu.open || !menu.project) return null;

  const project = menu.project;
  const isArchived = !!project.isArchived;

  // Window edge collision detection
  const menuWidth = 190;
  const menuHeight = 160;

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
      {/* Invisible backdrop to dismiss on blank click */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Floating Menu Card */}
      <div
        ref={menuRef}
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }}
        className="fixed z-50 min-w-[180px] rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800/80 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || '#3b82f6' }}
            />
            <span className="block truncate font-semibold text-zinc-100 text-xs max-w-[130px]">
              {project.name}
            </span>
          </div>
          {isArchived && (
            <span className="mt-0.5 inline-block text-[10px] text-zinc-500">
              (已归档项目)
            </span>
          )}
        </div>

        <div className="space-y-0.5 pt-1 text-xs text-zinc-300">
          {/* Rename Project */}
          <button
            type="button"
            onClick={() => {
              onRename(project);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5 text-blue-400" />
            <span>重命名项目</span>
          </button>

          {/* Archive / Restore Project */}
          <button
            type="button"
            onClick={() => {
              onToggleArchive(project);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-zinc-800 hover:text-white"
          >
            {isArchived ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                <span>恢复项目至进行中</span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5 text-amber-400" />
                <span>归档此项目</span>
              </>
            )}
          </button>

          <div className="my-1 border-t border-zinc-800/80" />

          {/* Delete Project */}
          <button
            type="button"
            onClick={() => {
              onDelete(project);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>删除项目</span>
          </button>
        </div>
      </div>
    </>
  );
}
