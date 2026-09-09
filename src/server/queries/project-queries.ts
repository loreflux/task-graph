'use server';

import { eq, desc, asc } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema';
import type { Project } from '@/types';
import { projectService, type ProjectStats } from '@/domain/services/project-service';

export async function getProjects(): Promise<Project[]> {
  return projectService.listProjects();
}

export async function getProjectById(id: string): Promise<Project | null> {
  return projectService.getProject(id);
}

export async function getProjectAnalytics(id: string): Promise<ProjectStats> {
  return projectService.getProjectStats(id);
}
