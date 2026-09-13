'use client';

import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { List, GitBranch, Network, Command, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  count?: number;
  onCreateTask?: () => void;
}

export function Header({ title, count, onCreateTask }: HeaderProps) {
  const { currentView, setCurrentView, toggleCommandPalette, toggleMobileSidebar } = useUIStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeView = mounted ? currentView : 'list';

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 md:px-6">
      {/* Left: Mobile Hamburger Toggle + Page Title & Count */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
          title="切换导航菜单"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="text-sm md:text-base font-semibold text-zinc-100 truncate max-w-[140px] sm:max-w-none">
          {title}
        </h1>
        {count !== undefined && (
          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-400">
            {count}
          </span>
        )}
      </div>

      {/* Center: View Switcher (List / Tree / Graph - Segmented Control) */}
      <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5 shadow-inner">
        <button
          onClick={() => setCurrentView('list')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 text-xs font-medium transition ${
            activeView === 'list'
              ? 'bg-zinc-800 text-blue-400 font-semibold shadow-sm border border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
          title="列表视图"
        >
          <List className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">列表</span>
        </button>

        <button
          onClick={() => setCurrentView('tree')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 text-xs font-medium transition ${
            activeView === 'tree'
              ? 'bg-zinc-800 text-blue-400 font-semibold shadow-sm border border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
          title="层级树视图"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">层级树</span>
        </button>

        <button
          onClick={() => setCurrentView('graph')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 text-xs font-medium transition ${
            activeView === 'graph'
              ? 'bg-zinc-800 text-blue-400 font-semibold shadow-sm border border-zinc-700/60'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
          title="依赖关系图"
        >
          <Network className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">依赖图</span>
        </button>
      </div>

      {/* Right: Quick actions & Command Palette button */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">命令面板</span>
          <kbd className="hidden sm:inline-block rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
}
