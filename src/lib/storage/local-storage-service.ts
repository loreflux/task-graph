/**
 * @module storage/local-storage-service
 * @description LocalStorage implementation of task, relation, and project storage.
 * Provides complete offline, client-side persistence with DAG cycle detection.
 */

import type {
  Task,
  TaskRelation,
  Project,
  CreateTaskInput,
  UpdateTaskInput,
  CreateProjectInput,
  UpdateProjectInput,
} from '@/types';
import {
  INITIAL_LOCAL_TASKS,
  INITIAL_LOCAL_RELATIONS,
  INITIAL_LOCAL_PROJECTS,
} from './local-seed-data';
import { detectCycle } from '@/lib/graph-algorithms/cycle-detection';
import { findAncestors } from '@/lib/graph-algorithms/ancestors';
import { getBlockedTasks } from '@/lib/graph-algorithms/blocked-analysis';
import { COMPLETION_STRATEGY, type CompletionStrategy } from '@/lib/constants';

const KEY_TASKS = 'task_graph_local_tasks_v1';
const KEY_RELATIONS = 'task_graph_local_relations_v1';
const KEY_PROJECTS = 'task_graph_local_projects_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function isStrictCyclePrevention(): boolean {
  if (!isBrowser()) return true;
  try {
    const raw = localStorage.getItem('task_graph_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.preventCyclesStrict === false) return false;
    }
  } catch {}
  return true;
}

function parseDates<T extends Record<string, any>>(obj: T): T {
  const res = { ...obj };
  for (const [k, v] of Object.entries(res)) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      (res as any)[k] = new Date(v);
    }
  }
  return res;
}

export const localStorageService = {
  // -------------------------------------------------------------
  // Data initializers
  // -------------------------------------------------------------
  getStoredTasks(): Task[] {
    if (!isBrowser()) return INITIAL_LOCAL_TASKS;
    const raw = localStorage.getItem(KEY_TASKS);
    if (!raw) {
      this.saveStoredTasks(INITIAL_LOCAL_TASKS);
      return INITIAL_LOCAL_TASKS;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((t: any) => parseDates(t));
    } catch {
      return INITIAL_LOCAL_TASKS;
    }
  },

  saveStoredTasks(tasks: Task[]): void {
    if (isBrowser()) {
      localStorage.setItem(KEY_TASKS, JSON.stringify(tasks));
    }
  },

  getStoredRelations(): TaskRelation[] {
    if (!isBrowser()) return INITIAL_LOCAL_RELATIONS;
    const raw = localStorage.getItem(KEY_RELATIONS);
    if (!raw) {
      this.saveStoredRelations(INITIAL_LOCAL_RELATIONS);
      return INITIAL_LOCAL_RELATIONS;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((r: any) => parseDates(r));
    } catch {
      return INITIAL_LOCAL_RELATIONS;
    }
  },

  saveStoredRelations(relations: TaskRelation[]): void {
    if (isBrowser()) {
      localStorage.setItem(KEY_RELATIONS, JSON.stringify(relations));
    }
  },

  getStoredProjects(): Project[] {
    if (!isBrowser()) return INITIAL_LOCAL_PROJECTS;
    const raw = localStorage.getItem(KEY_PROJECTS);
    if (!raw) {
      this.saveStoredProjects(INITIAL_LOCAL_PROJECTS);
      return INITIAL_LOCAL_PROJECTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((p: any) => parseDates(p));
    } catch {
      return INITIAL_LOCAL_PROJECTS;
    }
  },

  saveStoredProjects(projects: Project[]): void {
    if (isBrowser()) {
      localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects));
    }
  },

  // -------------------------------------------------------------
  // Tasks Query & Mutations
  // -------------------------------------------------------------
  getTasks(options?: { projectId?: string; includeArchived?: boolean }): Task[] {
    const all = this.getStoredTasks().filter((t) => !t.isDeleted);
    let res = all;
    if (options?.projectId) {
      res = res.filter((t) => t.projectId === options.projectId);
    }
    if (!options?.includeArchived) {
      res = res.filter((t) => t.status !== 'ARCHIVED');
    }
    return res.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getTaskById(id: string): any | null {
    const all = this.getStoredTasks();
    const task = all.find((t) => t.id === id && !t.isDeleted);
    if (!task) return null;

    const children = all.filter((t) => t.parentId === id && !t.isDeleted);
    const relations = this.getStoredRelations();
    const dependencies = relations.filter((r) => r.sourceTaskId === id);
    const dependents = relations.filter((r) => r.targetTaskId === id);

    return {
      ...task,
      children,
      dependencies,
      dependents,
    };
  },

  getInboxTasks(): Task[] {
    return this.getStoredTasks()
      .filter((t) => t.status === 'INBOX' && !t.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getArchivedTasks(): Task[] {
    return this.getStoredTasks()
      .filter((t) => t.status === 'ARCHIVED' && !t.isDeleted)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  getTrashTasks(): Task[] {
    return this.getStoredTasks()
      .filter((t) => t.isDeleted)
      .sort((a, b) => (new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()));
  },

  createTask(input: CreateTaskInput): Task {
    const all = this.getStoredTasks();
    const id = `local-task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    const newTask: Task = {
      id,
      title: input.title,
      description: input.description ?? null,
      status: input.status || 'TODO',
      priority: input.priority || 'NONE',
      projectId: input.projectId ?? null,
      parentId: input.parentId ?? null,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      isAllDay: input.isAllDay ?? false,
      estimatedDuration: input.estimatedDuration ?? null,
      actualDuration: input.actualDuration ?? null,
      sortOrder: all.length + 1,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    all.push(newTask);
    this.saveStoredTasks(all);
    return newTask;
  },

  updateTask(id: string, input: UpdateTaskInput): Task {
    const all = this.getStoredTasks();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`未找到任务: ${id}`);

    const existing = all[idx];
    const updated: Task = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    all[idx] = updated;
    this.saveStoredTasks(all);
    return updated;
  },

  deleteTask(id: string, permanent = false): void {
    let all = this.getStoredTasks();
    if (permanent) {
      all = all.filter((t) => t.id !== id);
      // Cascade delete relations
      const rels = this.getStoredRelations().filter(
        (r) => r.sourceTaskId !== id && r.targetTaskId !== id,
      );
      this.saveStoredRelations(rels);
    } else {
      const idx = all.findIndex((t) => t.id === id);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }
    this.saveStoredTasks(all);
  },

  restoreTask(id: string): Task {
    const all = this.getStoredTasks();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`未找到任务: ${id}`);

    all[idx] = {
      ...all[idx],
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    };

    this.saveStoredTasks(all);
    return all[idx];
  },

  archiveTask(id: string): Task {
    return this.updateTask(id, { status: 'ARCHIVED' });
  },

  completeTask(
    id: string,
    strategy: CompletionStrategy = COMPLETION_STRATEGY.SINGLE,
  ): { completed: string[] } {
    const all = this.getStoredTasks();
    const target = all.find((t) => t.id === id);
    if (!target) throw new Error(`未找到任务: ${id}`);

    const toComplete = new Set<string>([id]);

    if (strategy === COMPLETION_STRATEGY.WITH_CHILDREN) {
      const queue = [id];
      while (queue.length > 0) {
        const pId = queue.shift()!;
        const children = all.filter((t) => t.parentId === pId);
        for (const c of children) {
          toComplete.add(c.id);
          queue.push(c.id);
        }
      }
    } else if (strategy === COMPLETION_STRATEGY.WITH_DEPENDENCIES) {
      const adj = this.buildAdjacencyList();
      const ancestors = findAncestors(adj, id);
      for (const ancId of ancestors) {
        toComplete.add(ancId);
      }
    }

    const completedIds = Array.from(toComplete);
    const now = new Date();

    for (const t of all) {
      if (toComplete.has(t.id)) {
        t.status = 'DONE';
        t.updatedAt = now;
      }
    }

    this.saveStoredTasks(all);
    return { completed: completedIds };
  },

  uncompleteTask(id: string): Task {
    return this.updateTask(id, { status: 'TODO' });
  },

  batchComplete(ids: string[]): { completed: string[] } {
    const all = this.getStoredTasks();
    const idSet = new Set(ids);
    const now = new Date();

    for (const t of all) {
      if (idSet.has(t.id)) {
        t.status = 'DONE';
        t.updatedAt = now;
      }
    }

    this.saveStoredTasks(all);
    return { completed: ids };
  },

  batchArchive(ids: string[]): void {
    const all = this.getStoredTasks();
    const idSet = new Set(ids);
    const now = new Date();

    for (const t of all) {
      if (idSet.has(t.id)) {
        t.status = 'ARCHIVED';
        t.updatedAt = now;
      }
    }

    this.saveStoredTasks(all);
  },

  batchDelete(ids: string[], permanent = false): void {
    for (const id of ids) {
      this.deleteTask(id, permanent);
    }
  },

  checkUnfinishedDeps(taskId: string): { count: number; tasks: Task[] } {
    const rels = this.getStoredRelations();
    const deps = rels.filter((r) => r.sourceTaskId === taskId);
    if (deps.length === 0) return { count: 0, tasks: [] };

    const targetIds = new Set(deps.map((d) => d.targetTaskId));
    const all = this.getStoredTasks();
    const pending = all.filter(
      (t) => targetIds.has(t.id) && !t.isDeleted && t.status !== 'DONE',
    );

    return { count: pending.length, tasks: pending };
  },

  // -------------------------------------------------------------
  // Relations
  // -------------------------------------------------------------
  getAllRelations(projectId?: string): TaskRelation[] {
    const rels = this.getStoredRelations();
    if (!projectId) return rels;

    const projectTaskIds = new Set(
      this.getStoredTasks()
        .filter((t) => t.projectId === projectId)
        .map((t) => t.id),
    );

    return rels.filter(
      (r) => projectTaskIds.has(r.sourceTaskId) && projectTaskIds.has(r.targetTaskId),
    );
  },

  addDependency(
    sourceTaskId: string,
    targetTaskId: string,
    description?: string,
  ): TaskRelation {
    if (sourceTaskId === targetTaskId) {
      throw new Error('不能将任务依赖于自身');
    }

    const rels = this.getStoredRelations();
    const exists = rels.some(
      (r) => r.sourceTaskId === sourceTaskId && r.targetTaskId === targetTaskId,
    );
    if (exists) {
      throw new Error('该前置依赖已存在');
    }

    if (isStrictCyclePrevention()) {
      const adj = this.buildAdjacencyList();
      const cycleCheck = detectCycle(adj, sourceTaskId, targetTaskId);
      if (cycleCheck.hasCycle) {
        const pathStr = cycleCheck.cyclePath ? cycleCheck.cyclePath.join(' → ') : '';
        throw new Error(`无法建立依赖关系：会形成循环依赖！\n路径: ${pathStr}`);
      }
    }

    const newRel: TaskRelation = {
      id: `local-rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceTaskId,
      targetTaskId,
      relationType: 'DEPENDS_ON',
      description: description ?? null,
      createdAt: new Date(),
    };

    rels.push(newRel);
    this.saveStoredRelations(rels);
    return newRel;
  },

  removeDependency(relationId: string): void {
    const rels = this.getStoredRelations().filter((r) => r.id !== relationId);
    this.saveStoredRelations(rels);
  },

  buildAdjacencyList(): Map<string, string[]> {
    const tasks = this.getStoredTasks().filter((t) => !t.isDeleted);
    const rels = this.getStoredRelations();

    const adj = new Map<string, string[]>();
    for (const t of tasks) adj.set(t.id, []);
    for (const r of rels) {
      adj.get(r.sourceTaskId)?.push(r.targetTaskId);
    }
    return adj;
  },

  // -------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------
  getProjects(includeArchived = false): Project[] {
    let list = this.getStoredProjects();
    if (!includeArchived) {
      list = list.filter((p) => !p.isArchived);
    }
    return list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  getProjectById(id: string): Project | null {
    return this.getStoredProjects().find((p) => p.id === id) || null;
  },

  createProject(input: CreateProjectInput): Project {
    const all = this.getStoredProjects();
    const id = `local-proj-${Date.now()}`;
    const now = new Date();

    const newProject: Project = {
      id,
      name: input.name,
      description: input.description ?? null,
      color: input.color || '#3b82f6',
      isArchived: input.isArchived ?? false,
      createdAt: now,
      updatedAt: now,
    };

    all.push(newProject);
    this.saveStoredProjects(all);
    return newProject;
  },

  updateProject(id: string, input: UpdateProjectInput): Project {
    const all = this.getStoredProjects();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`未找到项目: ${id}`);

    all[idx] = {
      ...all[idx],
      ...input,
      updatedAt: new Date(),
    };

    this.saveStoredProjects(all);
    return all[idx];
  },

  archiveProject(id: string, archive = true): Project {
    return this.updateProject(id, { isArchived: archive });
  },

  deleteProject(id: string, deleteTasks = false): void {
    const all = this.getStoredProjects().filter((p) => p.id !== id);
    this.saveStoredProjects(all);

    // Either delete or unlink tasks
    let tasks = this.getStoredTasks();
    if (deleteTasks) {
      const taskIdsToDelete = new Set(tasks.filter((t) => t.projectId === id).map((t) => t.id));
      tasks = tasks.filter((t) => t.projectId !== id);
      const rels = this.getStoredRelations().filter(
        (r) => !taskIdsToDelete.has(r.sourceTaskId) && !taskIdsToDelete.has(r.targetTaskId),
      );
      this.saveStoredRelations(rels);
    } else {
      for (const t of tasks) {
        if (t.projectId === id) {
          t.projectId = null;
        }
      }
    }
    this.saveStoredTasks(tasks);
  },

  getProjectAnalytics(id: string): {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    completionRate: number;
  } {
    const projectTasks = this.getStoredTasks().filter(
      (t) => t.projectId === id && !t.isDeleted,
    );

    const now = new Date();
    const total = projectTasks.length;
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;
    let overdue = 0;

    for (const t of projectTasks) {
      if (t.status === 'DONE') {
        completed++;
      } else {
        if (t.status === 'IN_PROGRESS') inProgress++;
        if (t.status === 'BLOCKED') blocked++;
        if (t.endAt && new Date(t.endAt) < now) overdue++;
      }
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      blockedTasks: blocked,
      overdueTasks: overdue,
      completionRate,
    };
  },
};
