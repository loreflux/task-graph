'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  items?: string[];
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  items,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose?.();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            {isDanger ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-950/60 text-red-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950/60 text-blue-400">
                <HelpCircle className="h-4 w-4" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {items && items.length > 0 && (
          <div className="my-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2.5 text-xs text-zinc-300 space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-zinc-500">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className="rounded-md border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition focus:outline-none disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
