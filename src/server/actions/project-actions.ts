'use server';

import { revalidatePath } from 'next/cache';
import { projectService } from '@/domain/services/project-service';
import type { CreateProjectInput, UpdateProjectInput } from '@/types';

export async function createProjectAction(input: CreateProjectInput) {
  try {
    const project = await projectService.createProject(input);
    revalidatePath('/projects');
    return { success: true as const, data: project };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to create project' };
  }
}

export async function updateProjectAction(id: string, input: UpdateProjectInput) {
  try {
    const project = await projectService.updateProject(id, input);
    revalidatePath('/projects');
    return { success: true as const, data: project };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to update project' };
  }
}

export async function deleteProjectAction(id: string) {
  try {
    await projectService.deleteProject(id);
    revalidatePath('/projects');
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Failed to delete project' };
  }
}
