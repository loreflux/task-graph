import { AppShell } from '@/components/layout/app-shell';
import { PluginMarketplaceView } from '@/components/plugins/plugin-marketplace-view';

export const dynamic = 'force-dynamic';

export default function PluginsPage() {
  return (
    <AppShell title="插件市场与扩展中心">
      <PluginMarketplaceView />
    </AppShell>
  );
}
