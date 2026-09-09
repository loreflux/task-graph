'use server';

import { revalidatePath } from 'next/cache';
import { taskService } from '@/domain/services/task-service';
import { completionService, CompletionStrategy } from '@/domain/services/completion-service';
import type { CreateTaskInput, UpdateTaskInput, Task } from '@/types';

export async function createTaskAction(input: CreateTaskInput) {
  try {
    const task = await taskService.createTask(input);
    revalidatePath('/');
    return { success: true as const, data: task };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to create task' };
  }
}

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  try {
    const task = await taskService.updateTask(id, input);
    revalidatePath('/');
    return { success: true as const, data: task };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to update task' };
  }
}

export async function deleteTaskAction(id: string, permanent = false) {
  try {
    await taskService.deleteTask(id, permanent);
    revalidatePath('/');
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to delete task' };
  }
}

export async function restoreTaskAction(id: string) {
  try {
    const task = await taskService.restoreTask(id);
    revalidatePath('/');
    return { success: true as const, data: task };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to restore task' };
  }
}

export async function archiveTaskAction(id: string) {
  try {
    const task = await taskService.archiveTask(id);
    revalidatePath('/');
    return { success: true as const, data: task };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to archive task' };
  }
}

export async function completeTaskAction(
  id: string,
  strategy: CompletionStrategy = CompletionStrategy.SINGLE,
) {
  try {
    let result: { completed: string[] };
    if (strategy === CompletionStrategy.WITH_CHILDREN) {
      result = await completionService.completeWithChildren(id);
    } else if (strategy === CompletionStrategy.WITH_DEPENDENCIES) {
      result = await completionService.completeWithDependencies(id);
    } else {
      result = await completionService.completeTask(id);
    }

    revalidatePath('/');
    return { success: true as const, data: result };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to complete task' };
  }
}

export async function uncompleteTaskAction(id: string) {
  try {
    const task = await completionService.uncompleteTask(id);
    revalidatePath('/');
    return { success: true as const, data: task };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to uncomplete task' };
  }
}

export async function moveTaskAction(id: string, newParentId: string | null) {
  try {
    const task = await taskService.moveTask(id, newParentId);
    revalidatePath('/');
    return { success: true as const, data: task };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to move task' };
  }
}

export async function batchCompleteAction(ids: string[]) {
  try {
    const result = await completionService.batchComplete(ids);
    revalidatePath('/');
    return { success: true as const, data: result };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to batch complete' };
  }
}

export async function batchArchiveAction(ids: string[]) {
  try {
    await taskService.batchUpdate({
      ids,
      updates: { status: 'ARCHIVED' },
    });
    revalidatePath('/');
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to batch archive' };
  }
}

export async function batchDeleteAction(ids: string[], permanent = false) {
  try {
    for (const id of ids) {
      await taskService.deleteTask(id, permanent);
    }
    revalidatePath('/');
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to batch delete' };
  }
}

export async function checkUnfinishedDepsAction(taskId: string) {
  try {
    const result = await completionService.checkUnfinishedDependencies(taskId);
    return { success: true as const, data: result };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to check dependencies' };
  }
}
