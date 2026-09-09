import { create } from 'zustand';

export interface AppSettings {
  // 存储模式支持: localstorage | postgresql
  storageMode: 'postgresql' | 'localstorage';

  // 字体大小偏好: 紧凑 (13px) | 标准 (14px) | 舒适 (15px) | 较大 (16px)
  fontSize: 'compact' | 'standard' | 'comfortable' | 'large';

  // 常规设置
  defaultView: 'list' | 'tree' | 'graph';
  defaultTaskStatus: 'INBOX' | 'TODO';
  timezone: string;
  autoSaveDrawer: boolean;

  // 依赖与完成策略
  completionStrategy: 'SUGGESTION' | 'STRICT' | 'AUTO';
  preventCyclesStrict: boolean;

  // 画布偏好
  showMiniMap: boolean;
  edgeType: 'smoothstep' | 'bezier';
  graphDirection: 'LR' | 'TB';
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  storageMode: 'postgresql',
  fontSize: 'standard',

  defaultView: 'list',
  defaultTaskStatus: 'TODO',
  timezone: 'Asia/Shanghai (中国标准时间 GMT+8)',
  autoSaveDrawer: true,

  completionStrategy: 'SUGGESTION',
  preventCyclesStrict: true,

  showMiniMap: true,
  edgeType: 'smoothstep',
  graphDirection: 'LR',
};

const FONT_SIZE_MAP: Record<AppSettings['fontSize'], string> = {
  compact: '13px',
  standard: '14px',
  comfortable: '15px',
  large: '16px',
};

export function applyFontSizeToDOM(size: AppSettings['fontSize']): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[size] || '14px';
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  let initialSettings = DEFAULT_SETTINGS;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('task_graph_settings');
    if (raw) {
      try {
        initialSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch {}
    }
    // Apply initial font size to DOM
    applyFontSizeToDOM(initialSettings.fontSize);
  }

  return {
    settings: initialSettings,

    updateSettings: (partial) =>
      set((state) => {
        const updated = { ...state.settings, ...partial };
        if (typeof window !== 'undefined') {
          localStorage.setItem('task_graph_settings', JSON.stringify(updated));
          if (partial.fontSize) {
            applyFontSizeToDOM(partial.fontSize);
          }
        }
        return { settings: updated };
      }),

    resetSettings: () =>
      set(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('task_graph_settings');
          applyFontSizeToDOM(DEFAULT_SETTINGS.fontSize);
        }
        return { settings: DEFAULT_SETTINGS };
      }),
  };
});
