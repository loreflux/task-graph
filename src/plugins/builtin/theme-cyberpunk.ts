import type { PluginDefinition } from '@/types/plugin';

export const themeCyberpunkPlugin: PluginDefinition = {
  manifest: {
    id: 'theme-cyberpunk',
    name: '赛博朋克霓虹夜主题',
    version: '1.0.0',
    description: '注入高对比度赛博朋克暗黑荧光配色，青色与品红霓虹光影，呈现科幻极客视觉风格。',
    author: '官方设计组',
    category: 'theme',
    icon: 'Sparkles',
    tags: ['视觉主题', '赛博朋克', '霓虹', '高对比度'],
    defaultEnabled: false,
  },
  css: `
    /* Cyberpunk Neon Theme Overrides */
    body {
      --color-background: #06060f !important;
      --color-foreground: #e0f2fe !important;
      background-color: #06060f !important;
    }
    aside, header, [data-slot="app-shell"] {
      background-color: #080816 !important;
      border-color: #1a1a3a !important;
    }
    .react-flow__background {
      background-color: #06060f !important;
    }
    .react-flow__node-taskNode > div {
      border-color: #00f3ff !important;
      box-shadow: 0 0 15px rgba(0, 243, 255, 0.15) !important;
      background: linear-gradient(180deg, rgba(8, 8, 26, 0.95), rgba(12, 12, 35, 0.98)) !important;
    }
    .react-flow__node-taskNode:hover > div {
      box-shadow: 0 0 25px rgba(0, 243, 255, 0.35) !important;
    }
    button.bg-blue-600, .bg-blue-600 {
      background: linear-gradient(135deg, #00f3ff, #ff0055) !important;
      color: #000000 !important;
      font-weight: 700 !important;
      border: none !important;
      box-shadow: 0 0 12px rgba(0, 243, 255, 0.4) !important;
    }
  `,
};
