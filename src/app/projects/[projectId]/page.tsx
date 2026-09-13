import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { TodayView } from '@/components/task/today-view';
import { ProjectHeaderActions } from '@/components/project/project-header-actions';
import { getProjectById, getProjectAnalytics } from '@/server/queries/project-queries';
import { getTasks, getAllRelations } from '@/server/queries/task-queries';

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const [tasks, relations, stats] = await Promise.all([
    getTasks({ projectId, includeArchived: false }),
    getAllRelations(projectId),
    getProjectAnalytics(projectId),
  ]);

  return (
    <AppShell title={project.name} count={tasks.length}>
      <div className="flex h-full flex-col">
        {/* Project Header Metrics & Actions */}
        <ProjectHeaderActions project={project} stats={stats} />

        {/* View content (List / Tree / Graph) */}
        <div className="flex-1 overflow-hidden">
          <TodayView
            initialTasks={tasks}
            initialRelations={relations}
            projectId={projectId}
          />
        </div>
      </div>
    </AppShell>
  );
}
