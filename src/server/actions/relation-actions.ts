'use server';

import { revalidatePath } from 'next/cache';
import { relationService } from '@/domain/services/relation-service';

export async function addDependencyAction(
  sourceTaskId: string,
  targetTaskId: string,
  description?: string,
) {
  try {
    const relation = await relationService.addDependency(
      sourceTaskId,
      targetTaskId,
      description,
    );
    revalidatePath('/');
    return { success: true as const, data: relation };
  } catch (error: any) {
    return {
      success: false as const,
      error: error.message || 'Failed to add dependency',
    };
  }
}

export async function removeDependencyAction(relationId: string) {
  try {
    await relationService.removeDependency(relationId);
    revalidatePath('/');
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      error: error.message || 'Failed to remove dependency',
    };
  }
}

export async function getDependenciesAction(taskId: string) {
  try {
    const deps = await relationService.getDependencies(taskId);
    return { success: true as const, data: deps };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to get dependencies' };
  }
}

export async function getDependentsAction(taskId: string) {
  try {
    const deps = await relationService.getDependents(taskId);
    return { success: true as const, data: deps };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to get dependents' };
  }
}
