import { AppShell } from '@/components/layout/app-shell';
import { InboxView } from '@/components/task/inbox-view';
import { getInboxTasks } from '@/server/queries/task-queries';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const tasks = await getInboxTasks();

  return (
    <AppShell title="收件箱" count={tasks.length}>
      <InboxView />
    </AppShell>
  );
}
