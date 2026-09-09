import type { PluginDefinition } from '@/types/plugin';
import { themeCyberpunkPlugin } from './builtin/theme-cyberpunk';
import { themePaperWarmPlugin } from './builtin/theme-paper-warm';
import { featureGanttPlugin } from './builtin/feature-gantt';
import { featurePomodoroPlugin } from './builtin/feature-pomodoro';
import { featureBackupExportPlugin } from './builtin/feature-backup-export';

/**
 * Built-in official plugins registry
 */
export const BUILTIN_PLUGINS: PluginDefinition[] = [
  themeCyberpunkPlugin,
  themePaperWarmPlugin,
  featureGanttPlugin,
  featurePomodoroPlugin,
  featureBackupExportPlugin,
];

/**
 * Find plugin definition by ID across builtin list
 */
export function getPluginById(id: string): PluginDefinition | undefined {
  return BUILTIN_PLUGINS.find((p) => p.manifest.id === id);
}
