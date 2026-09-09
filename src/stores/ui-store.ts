import { create } from "zustand";
import type { ViewType } from "@/lib/constants";

interface UIState {
  /** Current view mode: list | tree | graph */
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  /** Currently selected task ID (for detail drawer) */
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  /** Whether the detail drawer is open */
  isDrawerOpen: boolean;
  openDrawer: (taskId: string) => void;
  closeDrawer: () => void;

  /** Whether the command palette is open */
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  /** Whether the quick create input is focused */
  isQuickCreateFocused: boolean;
  setQuickCreateFocused: (focused: boolean) => void;

  /** Current sidebar section */
  currentSection: string;
  setCurrentSection: (section: string) => void;

  /** Current project filter */
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;

  /** Task list filters */
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  priorityFilter: string[];
  setPriorityFilter: (priorities: string[]) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;

  /** Sidebar collapsed state */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Mobile sidebar open state */
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: "list",
  setCurrentView: (view) => set({ currentView: view }),

  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  isDrawerOpen: false,
  openDrawer: (taskId) =>
    set({ isDrawerOpen: true, selectedTaskId: taskId }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedTaskId: null }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),

  isQuickCreateFocused: false,
  setQuickCreateFocused: (focused) => set({ isQuickCreateFocused: focused }),

  currentSection: "today",
  setCurrentSection: (section) => set({ currentSection: section }),

  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  statusFilter: [],
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  priorityFilter: [],
  setPriorityFilter: (priorities) => set({ priorityFilter: priorities }),
  showCompleted: false,
  setShowCompleted: (show) => set({ showCompleted: show }),
  showArchived: false,
  setShowArchived: (show) => set({ showArchived: show }),

  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
}));
