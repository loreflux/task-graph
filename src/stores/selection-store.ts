import { create } from "zustand";

interface SelectionState {
  /** Set of currently selected task IDs */
  selectedIds: Set<string>;

  /** Select a single task (replaces current selection) */
  select: (id: string) => void;

  /** Toggle selection of a task */
  toggle: (id: string) => void;

  /** Add task to selection (multi-select) */
  addToSelection: (id: string) => void;

  /** Remove task from selection */
  removeFromSelection: (id: string) => void;

  /** Select multiple tasks at once */
  selectMany: (ids: string[]) => void;

  /** Clear all selection */
  clearSelection: () => void;

  /** Check if a task is selected */
  isSelected: (id: string) => boolean;

  /** Get count of selected items */
  count: () => number;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set<string>(),

  select: (id) => set({ selectedIds: new Set([id]) }),

  toggle: (id) => {
    const current = new Set(get().selectedIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    set({ selectedIds: current });
  },

  addToSelection: (id) => {
    const current = new Set(get().selectedIds);
    current.add(id);
    set({ selectedIds: current });
  },

  removeFromSelection: (id) => {
    const current = new Set(get().selectedIds);
    current.delete(id);
    set({ selectedIds: current });
  },

  selectMany: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  isSelected: (id) => get().selectedIds.has(id),

  count: () => get().selectedIds.size,
}));
