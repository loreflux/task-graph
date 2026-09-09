'use client';

import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { useSettingsStore } from '@/stores/settings-store';
import { X } from 'lucide-react';

export interface TaskEdgeData {
  description?: string | null;
  isCriticalPath?: boolean;
  onDelete?: (id: string) => void;
  sourceTitle?: string;
  targetTitle?: string;
}

export function TaskEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const { settings } = useSettingsStore();
  const [isHovered, setIsHovered] = useState(false);

  const edgeData = data as TaskEdgeData | undefined;
  const isCritical = edgeData?.isCriticalPath;

  const pathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  };

  const [edgePath, labelX, labelY] =
    settings.edgeType === 'bezier'
      ? getBezierPath(pathParams)
      : getSmoothStepPath(pathParams);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    edgeData?.onDelete?.(id);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          cursor: 'pointer',
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Floating delete button and relationship label */}
          <div
            className={`group flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] transition-all duration-200 shadow-md ${
              isCritical
                ? 'border-amber-500/60 bg-zinc-950/95 text-amber-300'
                : 'border-zinc-700 bg-zinc-950/95 text-zinc-300'
            } ${
              selected || isHovered
                ? 'opacity-100 scale-110 ring-2 ring-red-500/50'
                : 'opacity-40 hover:opacity-100'
            }`}
          >
            {edgeData?.description && (
              <span className="max-w-[100px] truncate px-1 text-[9px] text-zinc-400">
                {edgeData.description}
              </span>
            )}

            <button
              onClick={handleDelete}
              title="删除此依赖连线"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition hover:bg-red-600 hover:text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
