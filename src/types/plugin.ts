import type React from 'react';
import type { Task, TaskRelation, Project } from '@/types';
import type { AppSettings } from '@/stores/settings-store';

/**
 * Supported plugin categories
 */
export type PluginCategory = 'theme' | 'feature' | 'tool';

/**
 * Metadata manifest describing a plugin
 */
export interface PluginManifest {
  /** Unique plugin identifier (e.g. 'theme-cyberpunk', 'feature-gantt') */
  id: string;
  /** Human-readable Chinese name */
  name: string;
  /** Semantic version string */
  version: string;
  /** Brief summary of plugin capabilities */
  description: string;
  /** Plugin author name or organization */
  author: string;
  /** Category determining where and how the plugin operates */
  category: PluginCategory;
  /** Icon identifier from lucide-react */
  icon?: string;
  /** Search and display tags */
  tags?: string[];
  /** Whether the plugin is enabled by default on initial install */
  defaultEnabled?: boolean;
}

/**
 * Runtime context and APIs provided to plugins
 */
export interface PluginContext {
  /** Read-only snapshot of current tasks */
  tasks: Task[];
  /** Read-only snapshot of current relations */
  relations: TaskRelation[];
  /** Read-only snapshot of current projects */
  projects: Project[];
  /** Global application settings */
  settings: AppSettings;
  /** Refresh data in application views */
  refreshData: () => Promise<void>;
  /** Open detail drawer for a specific task */
  openTaskDrawer: (taskId: string) => void;
  /** Create a new task */
  createTask: (input: {
    title: string;
    description?: string | null;
    status?: Task['status'];
    priority?: Task['priority'];
    startAt?: Date | null;
    endAt?: Date | null;
    estimatedDuration?: number | null;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;
  /** Update an existing task */
  updateTask: (
    id: string,
    input: Partial<Task>,
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  /** Global Toast notification utility */
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
  ) => void;
  /** Synthesize and play gentle notification chime */
  playChime: () => void;
}

/**
 * Standard Plugin Definition contract.
 * Any custom plugin must implement this interface.
 */
export interface PluginDefinition {
  manifest: PluginManifest;
  /** CSS string to inject into DOM when enabled (mainly for 'theme' plugins) */
  css?: string;
  /** Interactive React Component rendered when the plugin is opened */
  component?: React.ComponentType<{
    ctx: PluginContext;
    onClose?: () => void;
  }>;
  /** Lifecycle hook invoked when the plugin is enabled */
  onEnable?: (ctx: PluginContext) => void | Promise<void>;
  /** Lifecycle hook invoked when the plugin is disabled */
  onDisable?: () => void | Promise<void>;
}
