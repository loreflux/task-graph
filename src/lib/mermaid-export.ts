import type { Task, TaskRelation } from '@/types';

/**
 * Generates a standard Mermaid flowchart (graph LR) from tasks and relations.
 */
export function exportToMermaid(tasks: Task[], relations: TaskRelation[]): string {
  const lines: string[] = ['graph LR'];

  // Style classes definitions
  lines.push('  %% 样式定义');
  lines.push('  classDef done fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#dcfce7;');
  lines.push('  classDef blocked fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fee2e2;');
  lines.push('  classDef inProgress fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fef3c7;');
  lines.push('  classDef todo fill:#1e293b,stroke:#64748b,stroke-width:1.5px,color:#f1f5f9;');
  lines.push('  classDef inbox fill:#18181b,stroke:#3f3f46,stroke-width:1px,color:#a1a1aa;');

  lines.push('');
  lines.push('  %% 任务节点定义');

  const safeId = (id: string) => `node_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  for (const t of tasks) {
    const sId = safeId(t.id);
    const escapedTitle = t.title.replace(/"/g, "'").replace(/[\[\]\(\)\{\}]/g, '');
    let icon = '';
    if (t.status === 'DONE') icon = '✓ ';
    else if (t.status === 'BLOCKED') icon = '🔒 ';
    else if (t.status === 'IN_PROGRESS') icon = '⏳ ';

    lines.push(`  ${sId}["${icon}${escapedTitle}"]`);

    if (t.status === 'DONE') lines.push(`  class ${sId} done`);
    else if (t.status === 'BLOCKED') lines.push(`  class ${sId} blocked`);
    else if (t.status === 'IN_PROGRESS') lines.push(`  class ${sId} inProgress`);
    else if (t.status === 'TODO') lines.push(`  class ${sId} todo`);
    else lines.push(`  class ${sId} inbox`);
  }

  lines.push('');
  lines.push('  %% 依赖关系连线');

  for (const rel of relations) {
    // In our model: sourceTaskId (dependent) DEPENDS_ON targetTaskId (prerequisite)
    // Flow: targetTaskId (前置) --> sourceTaskId (后置)
    const fromId = safeId(rel.targetTaskId);
    const toId = safeId(rel.sourceTaskId);

    if (rel.description) {
      const escapedDesc = rel.description.replace(/"/g, "'");
      lines.push(`  ${fromId} -->|"${escapedDesc}"| ${toId}`);
    } else {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generates a clean, portable JSON representation of the graph.
 */
export function exportToJson(tasks: Task[], relations: TaskRelation[]): string {
  const data = {
    appName: 'Task Graph',
    exportedAt: new Date().toISOString(),
    version: '1.0',
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      projectId: t.projectId,
      parentId: t.parentId,
      estimatedDuration: t.estimatedDuration,
      actualDuration: t.actualDuration,
      startAt: t.startAt,
      endAt: t.endAt,
    })),
    relations: relations.map((r) => ({
      id: r.id,
      prerequisiteTaskId: r.targetTaskId,
      dependentTaskId: r.sourceTaskId,
      description: r.description,
    })),
  };

  return JSON.stringify(data, null, 2);
}
