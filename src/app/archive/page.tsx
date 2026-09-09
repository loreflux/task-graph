import { AppShell } from '@/components/layout/app-shell';
import { getArchivedTasks } from '@/server/queries/task-queries';
import { ArchiveView } from '@/components/task/archive-view';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const tasks = await getArchivedTasks();

  return (
    <AppShell title="已归档任务" count={tasks.length}>
      <ArchiveView initialTasks={tasks} />
    </AppShell>
  );
}
