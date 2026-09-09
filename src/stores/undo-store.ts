import { create } from "zustand";

/** A command that can be undone/redone */
export interface UndoableCommand {
  /** Human-readable description */
  description: string;
  /** Execute the command */
  execute: () => Promise<void>;
  /** Undo the command */
  undo: () => Promise<void>;
}

interface UndoState {
  /** Past commands (undo stack) */
  past: UndoableCommand[];
  /** Future commands (redo stack) */
  future: UndoableCommand[];

  /** Execute a new command and push to undo stack */
  execute: (command: UndoableCommand) => Promise<void>;

  /** Undo the last command */
  undo: () => Promise<void>;

  /** Redo the last undone command */
  redo: () => Promise<void>;

  /** Check if undo is available */
  canUndo: () => boolean;

  /** Check if redo is available */
  canRedo: () => boolean;

  /** Clear all history */
  clear: () => void;
}

const MAX_HISTORY = 50;

export const useUndoStore = create<UndoState>((set, get) => ({
  past: [],
  future: [],

  execute: async (command) => {
    await command.execute();
    set((state) => ({
      past: [...state.past.slice(-MAX_HISTORY + 1), command],
      future: [], // clear redo stack on new action
    }));
  },

  undo: async () => {
    const { past, future } = get();
    if (past.length === 0) return;

    const command = past[past.length - 1];
    await command.undo();

    set({
      past: past.slice(0, -1),
      future: [command, ...future],
    });
  },

  redo: async () => {
    const { past, future } = get();
    if (future.length === 0) return;

    const command = future[0];
    await command.execute();

    set({
      past: [...past, command],
      future: future.slice(1),
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
