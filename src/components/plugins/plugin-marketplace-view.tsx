'use client';

import React, { useState } from 'react';
import { usePluginStore } from '@/stores/plugin-store';
import type { PluginCategory, PluginDefinition } from '@/types/plugin';
import {
  Blocks,
  Search,
  Sparkles,
  Palette,
  CalendarRange,
  Timer,
  Share2,
  CheckCircle2,
  Code2,
  ExternalLink,
  Plus,
  Trash2,
  Power,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export function PluginMarketplaceView() {
  const {
    getAllPlugins,
    isPluginEnabled,
    togglePlugin,
    openPluginModal,
    installCustomPlugin,
    uninstallCustomPlugin,
  } = usePluginStore();

  const [activeCategory, setActiveCategory] = useState<
    'ALL' | PluginCategory | 'DEV'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Developer custom plugin code input state
  const [customJsonInput, setCustomJsonInput] = useState(`{
  "manifest": {
    "id": "custom-ocean-theme",
    "name": "深海极光主题",
    "version": "1.0.0",
    "description": "自定义海洋深蓝低对比度配色方案",
    "author": "社区开发者",
    "category": "theme",
    "tags": ["自定义", "深海", "护眼"]
  },
  "css": "body { --color-background: #031525 !important; background-color: #031525 !important; }"
}`);

  const allPlugins = getAllPlugins();

  const filteredPlugins = allPlugins.filter((p) => {
    if (activeCategory !== 'ALL' && activeCategory !== 'DEV') {
      if (p.manifest.category !== activeCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.manifest.name.toLowerCase().includes(q);
      const matchDesc = p.manifest.description.toLowerCase().includes(q);
      const matchTag = p.manifest.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const getCategoryLabel = (category: PluginCategory) => {
    switch (category) {
      case 'theme':
        return '视觉主题';
      case 'feature':
        return '功能扩展';
      case 'tool':
        return '数据工具';
    }
  };

  const getCategoryBadgeColor = (category: PluginCategory) => {
    switch (category) {
      case 'theme':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'feature':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'tool':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const renderPluginIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="h-5 w-5 text-cyan-400" />;
      case 'Palette':
        return <Palette className="h-5 w-5 text-amber-400" />;
      case 'CalendarRange':
        return <CalendarRange className="h-5 w-5 text-indigo-400" />;
      case 'Timer':
        return <Timer className="h-5 w-5 text-rose-400" />;
      case 'Share2':
        return <Share2 className="h-5 w-5 text-emerald-400" />;
      default:
        return <Blocks className="h-5 w-5 text-blue-400" />;
    }
  };

  const handleInstallCustom = () => {
    try {
      const parsed = JSON.parse(customJsonInput);
      const res = installCustomPlugin(parsed);
      if (res.success) {
        toast.success(`已成功安装自定义插件: ${parsed.manifest.name}`);
        setActiveCategory('ALL');
      } else {
        toast.error(res.error || '安装自定义插件失败');
      }
    } catch {
      toast.error('JSON 格式错误，请检查输入的语法格式');
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-4 md:p-8">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <Blocks className="h-5 w-5" />
            </div>
            <h2 className="text-base md:text-xl font-bold text-zinc-100">
              插件市场与扩展中心 (Plugin Marketplace)
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            开放式可插拔生态架构：按标准契约自由扩展样式主题、时序推演、专注工具与外部联动。
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索插件或标签..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex overflow-x-auto gap-2 border-b border-zinc-800/60 pb-3 text-xs">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
            activeCategory === 'ALL'
              ? 'bg-zinc-800 text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          全部插件 ({allPlugins.length})
        </button>
        <button
          onClick={() => setActiveCategory('theme')}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
            activeCategory === 'theme'
              ? 'bg-purple-950/40 text-purple-300 border border-purple-500/40 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🎨 视觉样式主题
        </button>
        <button
          onClick={() => setActiveCategory('feature')}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
            activeCategory === 'feature'
              ? 'bg-blue-950/40 text-blue-300 border border-blue-500/40 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ⚡ 核心功能扩展
        </button>
        <button
          onClick={() => setActiveCategory('tool')}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
            activeCategory === 'tool'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📦 数据与辅助工具
        </button>
        <button
          onClick={() => setActiveCategory('DEV')}
          className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
            activeCategory === 'DEV'
              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🛠️ 开发者接口规范与自定义插件
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeCategory === 'DEV' ? (
          // DEVELOPER WORKBENCH & API SPECIFICATION
          <div className="max-w-4xl space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  插件标准接口规范 (Plugin API Specification)
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                本系统采用开放架构，任何开发者均可遵循 <code>PluginDefinition</code> 接口定义编写样式主题、功能视图与自动化脚本。系统提供全生命周期挂钩与运行时数据上下文。
              </p>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                <pre>{`export interface PluginDefinition {
  manifest: {
    id: string;              // 唯一插件标识符 (如 'my-custom-theme')
    name: string;            // 插件中文显示名
    version: string;         // 版本号 (语义化规范)
    description: string;     // 功能介绍与用途说明
    author: string;          // 开发者名称
    category: 'theme' | 'feature' | 'tool'; // 插件类型
    tags?: string[];         // 检索标签
    defaultEnabled?: boolean;// 默认是否启用
  };
  css?: string;              // 样式主题插件专用：动态注入 document.head 的 CSS
  component?: React.FC<{ ctx: PluginContext; onClose?: () => void }>; // 功能插件独立交互视图
  onEnable?: (ctx: PluginContext) => void;
  onDisable?: () => void;
}`}</pre>
              </div>
            </div>

            {/* Custom Plugin Installation Box */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-200">
                  录入 / 调试自定义插件定义 (JSON 格式)
                </h4>
                <button
                  onClick={handleInstallCustom}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>载入并安装此插件</span>
                </button>
              </div>

              <textarea
                value={customJsonInput}
                onChange={(e) => setCustomJsonInput(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:border-zinc-700 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          // PLUGINS GRID
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlugins.length === 0 ? (
              <div className="col-span-full flex h-64 flex-col items-center justify-center text-center text-zinc-500">
                <Blocks className="mb-2 h-8 w-8 text-zinc-600" />
                <p className="text-sm font-medium text-zinc-400">
                  没有找到匹配的插件
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  可切换筛选条件或进入开发者标签载入自定义插件
                </p>
              </div>
            ) : (
              filteredPlugins.map((plugin) => {
                const isEnabled = isPluginEnabled(plugin.manifest.id);
                const isBuiltin = !plugin.manifest.id.startsWith('custom-');

                return (
                  <div
                    key={plugin.manifest.id}
                    className={`group flex flex-col justify-between rounded-2xl border p-5 transition ${
                      isEnabled
                        ? 'border-zinc-700 bg-zinc-900/80 shadow-lg'
                        : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div>
                      {/* Card Header: Icon, Category & Toggle Switch */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
                            {renderPluginIcon(plugin.manifest.icon)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                              <span>{plugin.manifest.name}</span>
                              {isBuiltin && (
                                <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-medium text-blue-400">
                                  官方
                                </span>
                              )}
                            </h3>
                            <span className="text-[11px] text-zinc-500">
                              v{plugin.manifest.version} • {plugin.manifest.author}
                            </span>
                          </div>
                        </div>

                        {/* Enable/Disable Toggle */}
                        <button
                          onClick={() => togglePlugin(plugin.manifest.id)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                            isEnabled
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <Power className="h-3 w-3" />
                          <span>{isEnabled ? '已启用' : '未开启'}</span>
                        </button>
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-xs text-zinc-400 leading-relaxed min-h-[40px]">
                        {plugin.manifest.description}
                      </p>

                      {/* Tags */}
                      {plugin.manifest.tags && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${getCategoryBadgeColor(
                              plugin.manifest.category,
                            )}`}
                          >
                            {getCategoryLabel(plugin.manifest.category)}
                          </span>
                          {plugin.manifest.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions: Launch interactive component if available */}
                    <div className="mt-5 border-t border-zinc-800/80 pt-3 flex items-center justify-between">
                      {plugin.component ? (
                        <button
                          onClick={() => openPluginModal(plugin.manifest.id)}
                          disabled={!isEnabled}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>打开功能面板</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500">
                          {isEnabled ? '全局样式已生效' : '开启后自动生效'}
                        </span>
                      )}

                      {!isBuiltin && (
                        <button
                          onClick={() => uninstallCustomPlugin(plugin.manifest.id)}
                          title="卸载此自定义插件"
                          className="rounded p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
