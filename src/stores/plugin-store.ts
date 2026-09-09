import { create } from 'zustand';
import type { PluginDefinition } from '@/types/plugin';
import { BUILTIN_PLUGINS, getPluginById } from '@/plugins/registry';

interface PluginState {
  enabledPluginIds: string[];
  customPlugins: PluginDefinition[];
  activeModalPluginId: string | null;

  isPluginEnabled: (id: string) => boolean;
  togglePlugin: (id: string) => void;
  enablePlugin: (id: string) => void;
  disablePlugin: (id: string) => void;

  installCustomPlugin: (plugin: PluginDefinition) => { success: boolean; error?: string };
  uninstallCustomPlugin: (id: string) => void;

  openPluginModal: (id: string) => void;
  closePluginModal: () => void;

  getAllPlugins: () => PluginDefinition[];
}

/**
 * Apply or remove theme CSS dynamically in document.head
 */
function syncThemeCSS(id: string, enable: boolean, css?: string) {
  if (typeof document === 'undefined') return;

  const styleId = `task-graph-plugin-style-${id}`;
  const existing = document.getElementById(styleId);

  if (enable && css) {
    if (!existing) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }
  } else if (existing) {
    existing.remove();
  }
}

export const usePluginStore = create<PluginState>((set, get) => {
  // Initial default enabled IDs from builtin
  const defaultEnabled = BUILTIN_PLUGINS.filter(
    (p) => p.manifest.defaultEnabled,
  ).map((p) => p.manifest.id);

  let initialEnabled = defaultEnabled;
  let initialCustom: PluginDefinition[] = [];

  if (typeof window !== 'undefined') {
    const rawEnabled = localStorage.getItem('task_graph_enabled_plugins');
    if (rawEnabled) {
      try {
        initialEnabled = JSON.parse(rawEnabled);
      } catch {}
    }

    const rawCustom = localStorage.getItem('task_graph_custom_plugins');
    if (rawCustom) {
      try {
        initialCustom = JSON.parse(rawCustom);
      } catch {}
    }

    // Apply active theme styles on initial load
    for (const plugin of BUILTIN_PLUGINS) {
      if (plugin.css && initialEnabled.includes(plugin.manifest.id)) {
        syncThemeCSS(plugin.manifest.id, true, plugin.css);
      }
    }
  }

  return {
    enabledPluginIds: initialEnabled,
    customPlugins: initialCustom,
    activeModalPluginId: null,

    isPluginEnabled: (id) => get().enabledPluginIds.includes(id),

    getAllPlugins: () => {
      const custom = get().customPlugins;
      return [...BUILTIN_PLUGINS, ...custom];
    },

    togglePlugin: (id) => {
      const isCurrentlyEnabled = get().enabledPluginIds.includes(id);
      if (isCurrentlyEnabled) {
        get().disablePlugin(id);
      } else {
        get().enablePlugin(id);
      }
    },

    enablePlugin: (id) => {
      set((state) => {
        if (state.enabledPluginIds.includes(id)) return state;

        // If this is a theme plugin, disable other active theme plugins first to avoid conflicts
        const all = get().getAllPlugins();
        const target = all.find((p) => p.manifest.id === id);

        let newEnabled = [...state.enabledPluginIds];

        if (target?.manifest.category === 'theme') {
          // Disable any other theme
          const otherThemes = all.filter(
            (p) => p.manifest.category === 'theme' && p.manifest.id !== id,
          );
          for (const ot of otherThemes) {
            syncThemeCSS(ot.manifest.id, false);
            newEnabled = newEnabled.filter((eid) => eid !== ot.manifest.id);
          }
        }

        newEnabled.push(id);

        if (target?.css) {
          syncThemeCSS(id, true, target.css);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'task_graph_enabled_plugins',
            JSON.stringify(newEnabled),
          );
        }

        return { enabledPluginIds: newEnabled };
      });
    },

    disablePlugin: (id) => {
      set((state) => {
        const newEnabled = state.enabledPluginIds.filter((eid) => eid !== id);

        const all = get().getAllPlugins();
        const target = all.find((p) => p.manifest.id === id);
        if (target?.css) {
          syncThemeCSS(id, false);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'task_graph_enabled_plugins',
            JSON.stringify(newEnabled),
          );
        }

        return { enabledPluginIds: newEnabled };
      });
    },

    installCustomPlugin: (plugin) => {
      if (!plugin.manifest?.id || !plugin.manifest?.name) {
        return { success: false, error: '插件清单缺少必要 id 或 name' };
      }

      set((state) => {
        const updated = [...state.customPlugins.filter((p) => p.manifest.id !== plugin.manifest.id), plugin];
        if (typeof window !== 'undefined') {
          localStorage.setItem('task_graph_custom_plugins', JSON.stringify(updated));
        }
        return { customPlugins: updated };
      });

      return { success: true };
    },

    uninstallCustomPlugin: (id) => {
      get().disablePlugin(id);
      set((state) => {
        const updated = state.customPlugins.filter((p) => p.manifest.id !== id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('task_graph_custom_plugins', JSON.stringify(updated));
        }
        return { customPlugins: updated };
      });
    },

    openPluginModal: (id) => set({ activeModalPluginId: id }),
    closePluginModal: () => set({ activeModalPluginId: null }),
  };
});
