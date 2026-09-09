'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  onCheckedChange,
  disabled = false,
  className,
  size = 'md',
  id,
  label,
  description,
}: CheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onCheckedChange?.(!checked);
    }
  };

  const sizeBoxMap = {
    sm: 'h-3.5 w-3.5 rounded-[4px]',
    md: 'h-4 w-4 rounded-[5px]',
    lg: 'h-5 w-5 rounded-[6px]',
  };

  const sizeIconMap = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  const isSelected = checked || indeterminate;

  const checkboxBox = (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-shrink-0 items-center justify-center border transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950',
        sizeBoxMap[size],
        isSelected
          ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-900/30'
          : 'border-zinc-700 bg-zinc-900/80 text-transparent hover:border-zinc-500 hover:bg-zinc-800/60',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {indeterminate ? (
        <Minus className={cn('stroke-[2.5]', sizeIconMap[size])} />
      ) : checked ? (
        <Check className={cn('stroke-[2.5]', sizeIconMap[size])} />
      ) : null}
    </button>
  );

  if (!label && !description) {
    return checkboxBox;
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-2.5 select-none',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <div className="pt-0.5">{checkboxBox}</div>
      <div className="flex flex-col">
        {label && (
          <span className="text-xs font-medium text-zinc-200">{label}</span>
        )}
        {description && (
          <span className="text-[11px] text-zinc-500 leading-normal">{description}</span>
        )}
      </div>
    </div>
  );
}
