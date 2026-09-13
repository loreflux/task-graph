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

export const TASK_DATA_CHANGED_EVENT = 'task_data_changed';

export function notifyDataChanged(action?: string, payload?: any) {
  cache.clear();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(TASK_DATA_CHANGED_EVENT, { detail: { action, payload } }),
    );
  }
}

export const dataAdapter = {
  clearCache() {
    cache.clear();
  },
  notifyChange(action?: string, payload?: any) {
    notifyDataChanged(action, payload);
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
    let res: { success: boolean; data?: Task; error?: string };
    if (isLocalMode()) {
      try {
        const task = localStorageService.createTask(input);
        res = { success: true, data: task };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.createTaskAction(input);
    }
    if (res.success) notifyDataChanged('createTask', res.data);
    return res;
  },

  async updateTask(id: string, input: UpdateTaskInput): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Task; error?: string };
    if (isLocalMode()) {
      try {
        const task = localStorageService.updateTask(id, input);
        res = { success: true, data: task };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.updateTaskAction(id, input);
    }
    if (res.success) notifyDataChanged('updateTask', res.data);
    return res;
  },

  async deleteTask(id: string, permanent = false): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    let res: { success: boolean; error?: string };
    if (isLocalMode()) {
      try {
        localStorageService.deleteTask(id, permanent);
        res = { success: true };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.deleteTaskAction(id, permanent);
    }
    if (res.success) notifyDataChanged('deleteTask', { id, permanent });
    return res;
  },

  async restoreTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Task; error?: string };
    if (isLocalMode()) {
      try {
        const task = localStorageService.restoreTask(id);
        res = { success: true, data: task };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.restoreTaskAction(id);
    }
    if (res.success) notifyDataChanged('restoreTask', res.data);
    return res;
  },

  async archiveTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Task; error?: string };
    if (isLocalMode()) {
      try {
        const task = localStorageService.archiveTask(id);
        res = { success: true, data: task };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.archiveTaskAction(id);
    }
    if (res.success) notifyDataChanged('archiveTask', res.data);
    return res;
  },

  async completeTask(
    id: string,
    strategy: CompletionStrategy = COMPLETION_STRATEGY.SINGLE,
  ): Promise<{ success: boolean; data?: { completed: string[] }; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: { completed: string[] }; error?: string };
    if (isLocalMode()) {
      try {
        const result = localStorageService.completeTask(id, strategy);
        res = { success: true, data: result };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.completeTaskAction(id, strategy as any);
    }
    if (res.success) notifyDataChanged('completeTask', res.data);
    return res;
  },

  async uncompleteTask(id: string): Promise<{ success: boolean; data?: Task; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Task; error?: string };
    if (isLocalMode()) {
      try {
        const task = localStorageService.uncompleteTask(id);
        res = { success: true, data: task };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.uncompleteTaskAction(id);
    }
    if (res.success) notifyDataChanged('uncompleteTask', res.data);
    return res;
  },

  async batchComplete(ids: string[]): Promise<{ success: boolean; data?: { completed: string[] }; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: { completed: string[] }; error?: string };
    if (isLocalMode()) {
      try {
        const result = localStorageService.batchComplete(ids);
        res = { success: true, data: result };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.batchCompleteAction(ids);
    }
    if (res.success) notifyDataChanged('batchComplete', { ids });
    return res;
  },

  async batchArchive(ids: string[]): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    let res: { success: boolean; error?: string };
    if (isLocalMode()) {
      try {
        localStorageService.batchArchive(ids);
        res = { success: true };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.batchArchiveAction(ids);
    }
    if (res.success) notifyDataChanged('batchArchive', { ids });
    return res;
  },

  async batchDelete(ids: string[], permanent = false): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    let res: { success: boolean; error?: string };
    if (isLocalMode()) {
      try {
        localStorageService.batchDelete(ids, permanent);
        res = { success: true };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverTaskActions.batchDeleteAction(ids, permanent);
    }
    if (res.success) notifyDataChanged('batchDelete', { ids, permanent });
    return res;
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
    let res: { success: boolean; data?: TaskRelation; error?: string };
    if (isLocalMode()) {
      try {
        const rel = localStorageService.addDependency(sourceTaskId, targetTaskId, description);
        res = { success: true, data: rel };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverRelationActions.addDependencyAction(sourceTaskId, targetTaskId, description);
    }
    if (res.success) notifyDataChanged('addDependency', res.data);
    return res;
  },

  async removeDependency(relationId: string): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    let res: { success: boolean; error?: string };
    if (isLocalMode()) {
      try {
        localStorageService.removeDependency(relationId);
        res = { success: true };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverRelationActions.removeDependencyAction(relationId);
    }
    if (res.success) notifyDataChanged('removeDependency', { relationId });
    return res;
  },

  // -------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------
  async getProjects(includeArchived = false): Promise<Project[]> {
    if (isLocalMode()) {
      return localStorageService.getProjects(includeArchived);
    }
    if (!includeArchived && cache.projects && Date.now() - cache.projects.timestamp < CACHE_TTL_MS) {
      return cache.projects.data;
    }
    const res = await serverProjectQueries.getProjects();
    cache.projects = { data: res, timestamp: Date.now() };
    return includeArchived ? res : res.filter((p: any) => !p.isArchived);
  },

  async getProjectById(id: string): Promise<Project | null> {
    if (isLocalMode()) {
      return localStorageService.getProjectById(id);
    }
    return serverProjectQueries.getProjectById(id);
  },

  async createProject(input: CreateProjectInput): Promise<{ success: boolean; data?: Project; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Project; error?: string };
    if (isLocalMode()) {
      try {
        const p = localStorageService.createProject(input);
        res = { success: true, data: p };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverProjectActions.createProjectAction(input);
    }
    if (res.success) notifyDataChanged('createProject', res.data);
    return res;
  },

  async updateProject(id: string, input: UpdateProjectInput): Promise<{ success: boolean; data?: Project; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Project; error?: string };
    if (isLocalMode()) {
      try {
        const p = localStorageService.updateProject(id, input);
        res = { success: true, data: p };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverProjectActions.updateProjectAction(id, input);
    }
    if (res.success) notifyDataChanged('updateProject', res.data);
    return res;
  },

  async archiveProject(id: string, archive = true): Promise<{ success: boolean; data?: Project; error?: string }> {
    cache.clear();
    let res: { success: boolean; data?: Project; error?: string };
    if (isLocalMode()) {
      try {
        const p = localStorageService.archiveProject(id, archive);
        res = { success: true, data: p };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverProjectActions.archiveProjectAction(id, archive);
    }
    if (res.success) notifyDataChanged('archiveProject', res.data);
    return res;
  },

  async deleteProject(id: string, deleteTasks = false): Promise<{ success: boolean; error?: string }> {
    cache.clear();
    let res: { success: boolean; error?: string };
    if (isLocalMode()) {
      try {
        localStorageService.deleteProject(id, deleteTasks);
        res = { success: true };
      } catch (err: any) {
        res = { success: false, error: err.message };
      }
    } else {
      res = await serverProjectActions.deleteProjectAction(id);
    }
    if (res.success) notifyDataChanged('deleteProject', { id });
    return res;
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
