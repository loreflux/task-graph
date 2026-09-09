import { AppShell } from '@/components/layout/app-shell';
import { TodayView } from '@/components/task/today-view';
import { getTasks, getAllRelations } from '@/server/queries/task-queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [tasks, relations] = await Promise.all([
    getTasks({ includeArchived: false }),
    getAllRelations(),
  ]);

  return (
    <AppShell title="任务总览" count={tasks.length}>
      <TodayView initialTasks={tasks} initialRelations={relations} />
    </AppShell>
  );
}
