import { create } from 'zustand';

export interface UndoAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  timestamp: number;
}

interface UndoState {
  history: UndoAction[];
  pushAction: (action: {
    description: string;
    undo: () => Promise<void> | void;
    redo?: () => Promise<void> | void;
  }) => void;
  undo: () => Promise<boolean>;
  canUndo: boolean;
  lastActionDescription: string | null;
  clearHistory: () => void;
}

const MAX_HISTORY_LENGTH = 50;

export const useUndoStore = create<UndoState>((set, get) => ({
  history: [],
  canUndo: false,
  lastActionDescription: null,

  pushAction: (action) =>
    set((state) => {
      const newAction: UndoAction = {
        ...action,
        id: `undo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      };
      const updatedHistory = [...state.history, newAction].slice(-MAX_HISTORY_LENGTH);
      return {
        history: updatedHistory,
        canUndo: true,
        lastActionDescription: action.description,
      };
    }),

  undo: async () => {
    const { history } = get();
    if (history.length === 0) return false;

    const actionToUndo = history[history.length - 1];
    const remainingHistory = history.slice(0, -1);

    set({
      history: remainingHistory,
      canUndo: remainingHistory.length > 0,
      lastActionDescription:
        remainingHistory.length > 0
          ? remainingHistory[remainingHistory.length - 1].description
          : null,
    });

    try {
      await actionToUndo.undo();
      return true;
    } catch (err) {
      console.error('Failed to execute undo action:', err);
      return false;
    }
  },

  clearHistory: () =>
    set({
      history: [],
      canUndo: false,
      lastActionDescription: null,
    }),
}));
