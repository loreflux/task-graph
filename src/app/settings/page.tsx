import { AppShell } from '@/components/layout/app-shell';
import { SettingsView } from '@/components/settings/settings-view';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <AppShell title="系统偏好设置">
      <SettingsView />
    </AppShell>
  );
}
