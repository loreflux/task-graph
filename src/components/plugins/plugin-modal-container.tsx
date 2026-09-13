'use client';

import React, { useEffect, useState } from 'react';
import { usePluginStore } from '@/stores/plugin-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { playChimeSound } from '@/components/notification/deadline-reminder';
import type { Task, TaskRelation, Project } from '@/types';
import type { PluginContext } from '@/types/plugin';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export function PluginModalContainer({ onRefresh }: { onRefresh?: () => void }) {
  const { activeModalPluginId, closePluginModal, getAllPlugins } = usePluginStore();
  const { settings } = useSettingsStore();
  const { openDrawer } = useUIStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [relations, setRelations] = useState<TaskRelation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const loadData = async () => {
    try {
      const [ts, rs, ps] = await Promise.all([
        dataAdapter.getTasks({ includeArchived: true }),
        dataAdapter.getAllRelations(),
        dataAdapter.getProjects(),
      ]);
      setTasks(ts);
      setRelations(rs);
      setProjects(ps);
    } catch {}
  };

  useEffect(() => {
    if (activeModalPluginId) {
      loadData();
    }
  }, [activeModalPluginId]);

  if (!activeModalPluginId) return null;

  const all = getAllPlugins();
  const activePlugin = all.find((p) => p.manifest.id === activeModalPluginId);

  if (!activePlugin || !activePlugin.component) return null;

  const PluginComponent = activePlugin.component;

  const ctx: PluginContext = {
    tasks,
    relations,
    projects,
    settings,
    refreshData: async () => {
      await loadData();
      onRefresh?.();
    },
    openTaskDrawer: (taskId) => {
      openDrawer(taskId);
      closePluginModal();
    },
    createTask: async (input) => {
      const res = await dataAdapter.createTask(input);
      if (res.success) {
        await loadData();
        onRefresh?.();
      }
      return res;
    },
    updateTask: async (id, input) => {
      const res = await dataAdapter.updateTask(id, input);
      if (res.success) {
        await loadData();
        onRefresh?.();
      }
      return res;
    },
    showToast: (msg, type = 'info') => {
      if (type === 'success') toast.success(msg);
      else if (type === 'error') toast.error(msg);
      else if (type === 'warning') toast.warning(msg);
      else toast.info(msg);
    },
    playChime: () => playChimeSound(),
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closePluginModal}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePluginModal}
          title="关闭窗口 (Esc)"
          className="absolute right-3.5 top-3.5 z-50 rounded-lg bg-zinc-900/80 p-1.5 text-zinc-400 backdrop-blur-sm transition hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
        <PluginComponent ctx={ctx} onClose={closePluginModal} />
      </div>
    </div>
  );
}
