import type { PluginDefinition } from '@/types/plugin';

export const themePaperWarmPlugin: PluginDefinition = {
  manifest: {
    id: 'theme-paper-warm',
    name: '复古羊皮纸护眼主题',
    version: '1.0.0',
    description: '采用墨水暖棕与复古羊皮纸质感色调，极大降低屏幕蓝光刺激，专为长时高专注工作打造。',
    author: '官方设计组',
    category: 'theme',
    icon: 'Palette',
    tags: ['视觉主题', '低蓝光', '羊皮纸', '长时护眼'],
    defaultEnabled: false,
  },
  css: `
    /* Warm Parchment / E-Ink Eye Care Theme Overrides */
    body {
      --color-background: #181614 !important;
      --color-foreground: #ece5d8 !important;
      background-color: #181614 !important;
    }
    aside, header, [data-slot="app-shell"] {
      background-color: #1e1b18 !important;
      border-color: #322d28 !important;
    }
    .react-flow__background {
      background-color: #181614 !important;
    }
    .react-flow__node-taskNode > div {
      border-color: #52473d !important;
      background-color: #23201c !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
    }
    .text-zinc-400, .text-zinc-500 {
      color: #a89f91 !important;
    }
    .border-zinc-800 {
      border-color: #38322c !important;
    }
    .bg-zinc-900 {
      background-color: #26221d !important;
    }
  `,
};
