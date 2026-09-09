import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { TodayView } from '@/components/task/today-view';
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
        {/* Project Metrics Summary Bar */}
        <div className="flex items-center gap-6 border-b border-zinc-800/80 bg-zinc-900/30 px-6 py-2.5 text-xs text-zinc-400">
          <div>
            完成率: <span className="font-semibold text-zinc-100">{stats.completionRate}%</span>
          </div>
          <div>
            进行中: <span className="font-semibold text-amber-400">{stats.inProgressTasks}</span>
          </div>
          <div>
            已阻塞: <span className="font-semibold text-red-400">{stats.blockedTasks}</span>
          </div>
          {stats.overdueTasks > 0 && (
            <div>
              已逾期: <span className="font-semibold text-rose-400">{stats.overdueTasks}</span>
            </div>
          )}
        </div>

        {/* View content (List / Tree / Graph) */}
        <div className="flex-1 overflow-hidden">
          <TodayView initialTasks={tasks} initialRelations={relations} />
        </div>
      </div>
    </AppShell>
  );
}
