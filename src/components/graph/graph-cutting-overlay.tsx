'use client';

import React from 'react';

interface GraphCuttingOverlayProps {
  active: boolean;
  points: Array<{ x: number; y: number }>;
  severedCount: number;
}

export function GraphCuttingOverlay({
  active,
  points,
  severedCount,
}: GraphCuttingOverlayProps) {
  if (!active || points.length < 2) return null;

  // Construct SVG path string from points
  const d = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const tip = points[points.length - 1];

  return (
    <div className="pointer-events-none fixed inset-0 z-50 select-none">
      <svg className="h-full w-full overflow-visible">
        <defs>
          <filter id="laser-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer crimson glow aura */}
        <path
          d={d}
          fill="none"
          stroke="#ef4444"
          strokeWidth="6"
          strokeOpacity="0.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#laser-glow)"
        />

        {/* Core vibrant laser beam */}
        <path
          d={d}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner white-hot cutting core */}
        <path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cutting tip sparks */}
        <circle
          cx={tip.x}
          cy={tip.y}
          r="4.5"
          fill="#ffffff"
          stroke="#ef4444"
          strokeWidth="2"
          filter="url(#laser-glow)"
        />
      </svg>

      {/* Floating HUD status indicator following cursor tip */}
      <div
        style={{
          position: 'fixed',
          left: `${tip.x + 14}px`,
          top: `${tip.y - 12}px`,
        }}
        className="flex items-center gap-1.5 rounded-full border border-red-500/70 bg-zinc-950/95 px-2.5 py-1 text-[11px] font-medium text-red-200 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 duration-75"
      >
        <span className="text-red-400">✂️</span>
        <span>
          {severedCount > 0 ? (
            <>
              已命中 <strong className="text-white font-bold">{severedCount}</strong> 条连线 (松开切断)
            </>
          ) : (
            '划线切割连线'
          )}
        </span>
      </div>
    </div>
  );
}
