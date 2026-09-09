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

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          cursor: 'pointer',
          strokeWidth: selected || isHovered ? 2.5 : 1.5,
          filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))' : undefined,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
      />

      {edgeData?.description && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="nodrag nopan"
          >
            <div
              className={`rounded-full border px-2 py-0.5 text-[9px] shadow-sm backdrop-blur transition ${
                isCritical
                  ? 'border-amber-500/50 bg-zinc-950/90 text-amber-300'
                  : 'border-zinc-800 bg-zinc-950/85 text-zinc-400'
              }`}
            >
              <span className="max-w-[120px] truncate">{edgeData.description}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
