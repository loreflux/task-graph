import { create } from 'zustand';

export type FontSizeOption =
  | 'compact'
  | 'standard'
  | 'comfortable'
  | 'large'
  | 'huge'
  | 'cinema';

export interface AppSettings {
  // 存储模式支持: localstorage | postgresql
  storageMode: 'postgresql' | 'localstorage';

  // 字体大小偏好: 紧凑 (14px) | 标准 (16px) | 舒适 (18px) | 较大 (20px) | 特大 (22px) | 超大 (24px)
  fontSize: FontSizeOption;
  customFontSizePx: number | null; // 自定义直接设定像素大小 (12px ~ 28px)

  // 临期主动提醒配置
  enableDeadlineReminder: boolean;
  reminderLeadMinutes: number; // 提前提醒时长 (分钟): 15, 30, 60, 120
  enableAudioAlert: boolean; // 温和提示音
  enableDesktopNotification: boolean; // 桌面系统弹窗

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
  autoLayoutOnDataChange: boolean; // 数据变动时是否自动重新拓扑排版，默认 false
}

interface SettingsState {
  settings: AppSettings;
  loadFromStorage: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const FONT_SIZE_MAP: Record<FontSizeOption, string> = {
  compact: '14px',
  standard: '16px',
  comfortable: '18px',
  large: '20px',
  huge: '22px',
  cinema: '24px',
};

const DEFAULT_SETTINGS: AppSettings = {
  storageMode: 'postgresql',
  fontSize: 'standard',
  customFontSizePx: null,

  enableDeadlineReminder: true,
  reminderLeadMinutes: 30,
  enableAudioAlert: true,
  enableDesktopNotification: false,

  defaultView: 'list',
  defaultTaskStatus: 'TODO',
  timezone: '中国标准时间 (东八区)',
  autoSaveDrawer: true,

  completionStrategy: 'SUGGESTION',
  preventCyclesStrict: true,

  showMiniMap: true,
  edgeType: 'smoothstep',
  graphDirection: 'LR',
  autoLayoutOnDataChange: false,
};

export function applyFontSizeToDOM(
  size: FontSizeOption,
  customPx?: number | null,
): void {
  if (typeof document !== 'undefined') {
    const px =
      customPx && customPx >= 12 && customPx <= 32
        ? `${customPx}px`
        : FONT_SIZE_MAP[size] || '16px';
    document.documentElement.style.setProperty('font-size', px, 'important');
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('task_graph_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        set({ settings: merged });
        applyFontSizeToDOM(merged.fontSize, merged.customFontSizePx);
      } else {
        applyFontSizeToDOM(DEFAULT_SETTINGS.fontSize, null);
      }
    } catch {}
  },

  updateSettings: (partial) =>
    set((state) => {
      const updated = { ...state.settings, ...partial };
      if (typeof window !== 'undefined') {
        localStorage.setItem('task_graph_settings', JSON.stringify(updated));
        if (partial.fontSize !== undefined || partial.customFontSizePx !== undefined) {
          applyFontSizeToDOM(updated.fontSize, updated.customFontSizePx);
        }
      }
      return { settings: updated };
    }),

  resetSettings: () =>
    set(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('task_graph_settings');
        applyFontSizeToDOM(DEFAULT_SETTINGS.fontSize, null);
      }
      return { settings: DEFAULT_SETTINGS };
    }),
}));
