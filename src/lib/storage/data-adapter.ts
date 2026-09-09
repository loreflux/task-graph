/**
 * @module storage/data-adapter
 * @description Unified data adapter routing operations to LocalStorage or PostgreSQL
 * based on user preference in settings, with high-performance in-memory caching for zero-latency UI responses.
 */

import { useSettingsStore } from '@/stores/settings-store';
import { localStorageService } from './local-storage-service';
import * as serverTaskQueries from '@/server/queries/task-queries';
import * as serverProjectQueries from '@/server/queries/project-queries';
import * as serverTaskActions from '@/server/actions/task-actions';
import * as serverRelationActions from '@/server/actions/relation-actions';
import * as serverProjectActions from '@/server/actions/project-actions';
import type {
  Task,
  TaskWithRelations,
  TaskRelation,
  Project,
  CreateTaskInput,
  UpdateTaskInput,
  CreateProjectInput,
  UpdateProjectInput,
} from '@/types';
import { COMPLETION_STRATEGY, type CompletionStrategy } from '@/lib/constants';

function isLocalMode(): boolean {
  if (typeof window === 'undefined') return false;
  return useSettingsStore.getState().settings.storageMode === 'localstorage';
}

// ---------------------------------------------------------------------------
// High-Performance Query In-Memory Cache (Instant UI Response)
// ---------------------------------------------------------------------------
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 6000; // 6 seconds cache lifetime for instant queries

const cache = {
  tasks: new Map<string, CacheItem<Task[]>>(),
  taskById: new Map<string, CacheItem<TaskWithRelations | null>>(),
  relations: new Map<string, CacheItem<TaskRelation[]>>(),
  projects: null as CacheItem<Project[]> | null,
  inbox: null as CacheItem<Task[]> | null,
  archived: null as CacheItem<Task[]> | null,
  trash: null as CacheItem<Task[]> | null,

  clear() {
    this.tasks.clear();
    this.taskById.clear();
    this.relations.clear();
    this.projects = null;
    this.inbox = null;
    this.archived = null;
    this.trash = null;
  },
};

export const dataAdapter = {
  clearCache() {
    cache.clear();
  },

  // -------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------
  async getTasks(options?: { projectId?: string; includeArchived?: boolean }): Promise<Task[]> {
    if (isLocalMode()) {
      return localStorageService.getTasks(options);
    }

    const key = `${options?.projectId || 'all'}_${options?.includeArchived ? '1' : '0'}`;
    const cached = cache.tasks.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const res = await serverTaskQueries.getTasks(options);
    cache.tasks.set(key, { data: res, timestamp: Date.now() });
    return res;
  },

  async getTaskById(id: string): Promise<TaskWithRelations | null> {
    if (isLocalMode()) {
      return localStorageService.getTaskById(id);
    }

    const cached = cache.taskById.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const res = await serverTaskQueries.getTaskById(id);
    cache.taskById.set(id, { data: res, timestamp: Date.now() });
    return res;
  },

  async getInboxTasks(): Promise<Task[]> {
    if (isLocalMode()) {
      return localStorageService.getInboxTasks();
    }
    if (cache.inbox && Date.now() - cache.inbox.timestamp < CACHE_TTL_MS) {
      return cache.inbox.data;
    }
    const res = await serverTaskQueries.getInboxTasks();
    cache.inbox = { data: res, timestamp: Date.now() };
    return res;
  },

  async getArchivedTasks(): Promise<Task[]> {
    if (isLocalMode()) {
      return localStorageService.getArchivedTasks();
    }
    if (cache.archived && Date.now() - cache.archived.timestamp < CACHE_TTL_MS) {
      return cache.archived.data;
    }
    const res = await serverTaskQueries.getArchivedTasks();
    cache.archived = { data: res, timestamp: Date.now() };
    return res;
  },

  async getTrashTasks(): Promise<Task[]> {
    if (isLocalMode()) {
      return localStorageService.getTrashTasks();
    }
    if (cache.trash && Date.now() - cache.trash.timestamp < CACHE_TTL_MS) {
      return cache.trash.data;
    }
    const res = await serverTaskQueries.getTrashTasks();
    cache.trash = { data: res, timestamp: Date.now() };
    return res;
  },

  async createTask(input: CreateTaskInput): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const task = localStorageService.createTask(input);
        return { success: true, data: task };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.createTaskAction(input);
  },

  async updateTask(id: string, input: UpdateTaskInput): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const task = localStorageService.updateTask(id, input);
        return { success: true, data: task };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.updateTaskAction(id, input);
  },

  async deleteTask(id: string, permanent = false): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        localStorageService.deleteTask(id, permanent);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.deleteTaskAction(id, permanent);
  },

  async restoreTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const task = localStorageService.restoreTask(id);
        return { success: true, data: task };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.restoreTaskAction(id);
  },

  async archiveTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const task = localStorageService.archiveTask(id);
        return { success: true, data: task };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.archiveTaskAction(id);
  },

  async completeTask(
    id: string,
    strategy: CompletionStrategy = COMPLETION_STRATEGY.SINGLE,
  ): Promise<{ success: boolean; data?: { completed: string[] }; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const res = localStorageService.completeTask(id, strategy);
        return { success: true, data: res };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.completeTaskAction(id, strategy as any);
  },

  async uncompleteTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const task = localStorageService.uncompleteTask(id);
        return { success: true, data: task };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.uncompleteTaskAction(id);
  },

  async batchComplete(ids: string[]): Promise<{ success: boolean; data?: { completed: string[] }; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const res = localStorageService.batchComplete(ids);
        return { success: true, data: res };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.batchCompleteAction(ids);
  },

  async batchArchive(ids: string[]): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        localStorageService.batchArchive(ids);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.batchArchiveAction(ids);
  },

  async batchDelete(ids: string[], permanent = false): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        localStorageService.batchDelete(ids, permanent);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverTaskActions.batchDeleteAction(ids, permanent);
  },

  async checkUnfinishedDeps(taskId: string): Promise<{ success: boolean; data?: { count: number; tasks: Task[] }; error?: string }> {
    if (isLocalMode()) {
      const res = localStorageService.checkUnfinishedDeps(taskId);
      return { success: true, data: res };
    }
    return serverTaskActions.checkUnfinishedDepsAction(taskId);
  },

  // -------------------------------------------------------------
  // Relations
  // -------------------------------------------------------------
  async getAllRelations(projectId?: string): Promise<TaskRelation[]> {
    if (isLocalMode()) {
      return localStorageService.getAllRelations(projectId);
    }
    const key = projectId || 'all';
    const cached = cache.relations.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    const res = await serverTaskQueries.getAllRelations(projectId);
    cache.relations.set(key, { data: res, timestamp: Date.now() });
    return res;
  },

  async addDependency(
    sourceTaskId: string,
    targetTaskId: string,
    description?: string,
  ): Promise<{ success: boolean; data?: TaskRelation; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const rel = localStorageService.addDependency(sourceTaskId, targetTaskId, description);
        return { success: true, data: rel };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverRelationActions.addDependencyAction(sourceTaskId, targetTaskId, description);
  },

  async removeDependency(relationId: string): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        localStorageService.removeDependency(relationId);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverRelationActions.removeDependencyAction(relationId);
  },

  // -------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------
  async getProjects(): Promise<Project[]> {
    if (isLocalMode()) {
      return localStorageService.getProjects();
    }
    if (cache.projects && Date.now() - cache.projects.timestamp < CACHE_TTL_MS) {
      return cache.projects.data;
    }
    const res = await serverProjectQueries.getProjects();
    cache.projects = { data: res, timestamp: Date.now() };
    return res;
  },

  async getProjectById(id: string): Promise<Project | null> {
    if (isLocalMode()) {
      return localStorageService.getProjectById(id);
    }
    return serverProjectQueries.getProjectById(id);
  },

  async createProject(input: CreateProjectInput): Promise<{ success: boolean; data?: Project; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const p = localStorageService.createProject(input);
        return { success: true, data: p };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverProjectActions.createProjectAction(input);
  },

  async updateProject(id: string, input: UpdateProjectInput): Promise<{ success: boolean; data?: Project; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        const p = localStorageService.updateProject(id, input);
        return { success: true, data: p };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverProjectActions.updateProjectAction(id, input);
  },

  async deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    if (isLocalMode()) {
      try {
        localStorageService.deleteProject(id);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return serverProjectActions.deleteProjectAction(id);
  },

  async getProjectAnalytics(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    completionRate: number;
  }> {
    if (isLocalMode()) {
      return localStorageService.getProjectAnalytics(id);
    }
    return serverProjectQueries.getProjectAnalytics(id);
  },
};
