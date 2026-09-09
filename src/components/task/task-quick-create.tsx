'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { toast } from 'sonner';

interface TaskQuickCreateProps {
  parentId?: string | null;
  projectId?: string | null;
  placeholder?: string;
  defaultStatus?: 'INBOX' | 'TODO';
  onCreated?: () => void;
}

export function TaskQuickCreate({
  parentId = null,
  projectId = null,
  placeholder = '输入任务标题，按 Enter 快速创建...',
  defaultStatus = 'TODO',
  onCreated,
}: TaskQuickCreateProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await dataAdapter.createTask({
        title: trimmed,
        status: defaultStatus,
        priority: 'NONE',
        parentId,
        projectId,
      });

      if (!res.success) {
        toast.error(res.error || '创建任务失败');
      } else {
        setTitle('');
        toast.success(`已创建任务: ${trimmed}`);
        onCreated?.();
      }
    } catch (err: any) {
      toast.error('网络或服务异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <div className="pointer-events-none absolute left-3 flex items-center text-zinc-500">
        <Plus className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSubmitting}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
      />
    </form>
  );
}
