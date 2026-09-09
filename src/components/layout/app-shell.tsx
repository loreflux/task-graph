'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { DetailDrawer } from './detail-drawer';
import { CommandPalette } from '@/components/command-palette';
import { DeadlineReminderManager } from '@/components/notification/deadline-reminder';
import { PluginModalContainer } from '@/components/plugins/plugin-modal-container';
import { useUIStore } from '@/stores/ui-store';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  count?: number;
  onRefresh?: () => void;
}

export function AppShell({
  children,
  title,
  count,
  onRefresh,
}: AppShellProps) {
  const {
    setCurrentView,
    toggleCommandPalette,
    closeDrawer,
    isDrawerOpen,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUIStore();

  // Keyboard shortcut listener (§47)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Ctrl/Cmd + K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Esc: close drawer or mobile sidebar
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          e.preventDefault();
          closeDrawer();
          return;
        }
        if (isMobileSidebarOpen) {
          e.preventDefault();
          setMobileSidebarOpen(false);
          return;
        }
      }

      // Single-key shortcuts
      switch (e.key.toLowerCase()) {
        case 'l':
          setCurrentView('list');
          break;
        case 't':
          setCurrentView('tree');
          break;
        case 'g':
          setCurrentView('graph');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, isDrawerOpen, closeDrawer, setCurrentView, isMobileSidebarOpen, setMobileSidebarOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      {/* Desktop Sidebar (hidden on mobile, visible on md and above) */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          {/* Drawer Sidebar */}
          <div className="relative z-10 w-64 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header title={title} count={count} />
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>

      {/* Right Detail Drawer */}
      <DetailDrawer onRefresh={onRefresh} />

      {/* Command Palette Modal */}
      <CommandPalette onRefresh={onRefresh} />

      {/* Proactive Task Deadline Reminder Background Manager */}
      <DeadlineReminderManager />

      {/* Global Plugin Modal Container for Interactive Plugins */}
      <PluginModalContainer onRefresh={onRefresh} />
    </div>
  );
}
