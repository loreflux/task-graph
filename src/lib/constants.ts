import { TaskStatus, TaskPriority } from "@/types";

/** Human-readable labels for task statuses */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  INBOX: "收件箱",
  TODO: "待办",
  IN_PROGRESS: "进行中",
  BLOCKED: "已阻塞",
  DONE: "已完成",
  ARCHIVED: "已归档",
} as const;

/** Status display colors (matching CSS custom properties) */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  INBOX: "text-status-inbox",
  TODO: "text-status-todo",
  IN_PROGRESS: "text-status-in-progress",
  BLOCKED: "text-status-blocked",
  DONE: "text-status-done",
  ARCHIVED: "text-status-archived",
} as const;

/** Human-readable labels for priorities */
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  NONE: "无",
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
} as const;

/** Priority display colors */
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  NONE: "text-priority-none",
  LOW: "text-priority-low",
  MEDIUM: "text-priority-medium",
  HIGH: "text-priority-high",
  URGENT: "text-priority-urgent",
} as const;

/** Keyboard shortcuts */
export const SHORTCUTS = {
  NEW_TASK: "n",
  CONFIRM: "Enter",
  EDIT: "e",
  COMPLETE: " ", // Space
  DELETE: "Delete",
  ARCHIVE: "a",
  SEARCH: "f",
  GRAPH_VIEW: "g",
  LIST_VIEW: "l",
  TREE_VIEW: "t",
  CLOSE_PANEL: "Escape",
  COMMAND_PALETTE: "k", // with Ctrl/Cmd
  UNDO: "z", // with Ctrl/Cmd
  REDO: "z", // with Ctrl/Cmd + Shift
} as const;

/** View types */
export const VIEW_TYPES = {
  LIST: "list",
  TREE: "tree",
  GRAPH: "graph",
} as const;

export type ViewType = (typeof VIEW_TYPES)[keyof typeof VIEW_TYPES];

/** Completion strategies */
export const COMPLETION_STRATEGY = {
  SINGLE: "SINGLE",
  WITH_CHILDREN: "WITH_CHILDREN",
  WITH_DEPENDENCIES: "WITH_DEPENDENCIES",
} as const;

export type CompletionStrategy =
  (typeof COMPLETION_STRATEGY)[keyof typeof COMPLETION_STRATEGY];

/** Sidebar navigation items */
export const NAV_ITEMS = [
  { id: "today", label: "今天", icon: "CalendarDays", href: "/" },
  { id: "inbox", label: "收件箱", icon: "Inbox", href: "/inbox" },
  { id: "projects", label: "项目", icon: "FolderKanban", href: "/projects" },
  { id: "archive", label: "归档", icon: "Archive", href: "/archive" },
  { id: "trash", label: "回收站", icon: "Trash2", href: "/trash" },
] as const;
