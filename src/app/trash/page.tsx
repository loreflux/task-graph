import { AppShell } from '@/components/layout/app-shell';
import { getTrashTasks } from '@/server/queries/task-queries';
import { TrashView } from '@/components/task/trash-view';

export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  const tasks = await getTrashTasks();

  return (
    <AppShell title="回收站" count={tasks.length}>
      <TrashView initialTasks={tasks} />
    </AppShell>
  );
}
