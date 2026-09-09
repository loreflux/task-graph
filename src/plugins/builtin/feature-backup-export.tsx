'use client';

import React, { useState } from 'react';
import type { PluginContext } from '@/types/plugin';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import { dataAdapter } from '@/lib/storage/data-adapter';
import {
  Download,
  Upload,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  X,
} from 'lucide-react';

export function BackupExportComponent({
  ctx,
  onClose,
}: {
  ctx: PluginContext;
  onClose?: () => void;
}) {
  const { tasks, relations, projects, showToast, refreshData } = ctx;
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Generate Mermaid DAG code
  const generateMermaid = () => {
    let code = 'graph LR\n';
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    for (const t of tasks) {
      const cleanTitle = t.title.replace(/["()]/g, '');
      const isDone = t.status === 'DONE';
      code += `  ${t.id.slice(0, 6)}["${cleanTitle}${isDone ? ' (已完成)' : ''}"]\n`;
    }

    for (const r of relations) {
      if (taskMap.has(r.sourceTaskId) && taskMap.has(r.targetTaskId)) {
        // targetTaskId -> sourceTaskId
        code += `  ${r.targetTaskId.slice(0, 6)} --> ${r.sourceTaskId.slice(0, 6)}\n`;
      }
    }
    return code;
  };

  // Generate Markdown checklist
  const generateMarkdown = () => {
    let md = `# 任务拓扑导出清单 (${new Date().toLocaleDateString()})\n\n`;
    for (const t of tasks) {
      const check = t.status === 'DONE' ? '[x]' : '[ ]';
      md += `- ${check} **${t.title}** [${TASK_STATUS_LABELS[t.status]}]\n`;
      if (t.description) {
        md += `  > ${t.description}\n`;
      }
    }
    return md;
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast('已复制到剪贴板！', 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Download JSON file
  const handleDownloadJSON = () => {
    const data = {
      version: '1.0',
      exportAt: new Date().toISOString(),
      projects,
      tasks,
      relations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task_graph_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已成功导出完整 JSON 备份文件', 'success');
  };

  // Handle JSON File Import
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.tasks || !Array.isArray(json.tasks)) {
          showToast('导入失败：无效的备份文件结构', 'error');
          return;
        }

        // Import into current adapter
        let count = 0;
        for (const t of json.tasks) {
          await dataAdapter.createTask({
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            startAt: t.startAt ? new Date(t.startAt) : null,
            endAt: t.endAt ? new Date(t.endAt) : null,
            estimatedDuration: t.estimatedDuration,
          });
          count++;
        }

        showToast(`成功还原导入 ${count} 个任务！`, 'success');
        await refreshData();
        onClose?.();
      } catch {
        showToast('解析 JSON 文件出错，请检查文件格式', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl max-w-xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold">数据导入导出与备份中心</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4 text-xs">
        {/* Export JSON Card */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div>
            <span className="font-semibold text-zinc-200">全量数据 JSON 备份导出</span>
            <p className="mt-0.5 text-zinc-400">
              打包包含所有项目、任务、时序与拓扑依赖关系，便于异地迁移与灾备保存。
            </p>
          </div>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white transition hover:bg-emerald-500 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>下载备份</span>
          </button>
        </div>

        {/* Import JSON Card */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div>
            <span className="font-semibold text-zinc-200">恢复与导入 JSON 备份</span>
            <p className="mt-0.5 text-zinc-400">
              从本地 JSON 文件中恢复任务拓扑结构，自动导入当前存储引擎。
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-medium text-zinc-200 hover:bg-zinc-700">
            <Upload className="h-4 w-4" />
            <span>选择文件</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>

        {/* Export Mermaid Diagram Card */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div>
            <span className="font-semibold text-zinc-200">Mermaid 拓扑图代码导出</span>
            <p className="mt-0.5 text-zinc-400">
              复制标准 Mermaid 语法代码，可直接粘贴至 Notion、GitHub 或 Markdown 笔记中渲染。
            </p>
          </div>
          <button
            onClick={() => handleCopy(generateMermaid(), 'mermaid')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            {copiedType === 'mermaid' ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>复制代码</span>
              </>
            )}
          </button>
        </div>

        {/* Export Markdown Checklist Card */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div>
            <span className="font-semibold text-zinc-200">Markdown 待办任务清单</span>
            <p className="mt-0.5 text-zinc-400">
              快速导出带层级与完成状态勾选框的纯文本 Markdown 任务报告。
            </p>
          </div>
          <button
            onClick={() => handleCopy(generateMarkdown(), 'md')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            {copiedType === 'md' ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">已复制</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>复制文本</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export const featureBackupExportPlugin = {
  manifest: {
    id: 'feature-backup-export',
    name: '数据导入导出与备份',
    version: '1.0.0',
    description: '支持将任务拓扑图导出为 Mermaid 图表、Markdown 清单，并提供完整 JSON 备份及灾备还原能力。',
    author: '官方数据组',
    category: 'tool' as const,
    icon: 'Share2',
    tags: ['数据工具', '备份', 'Mermaid', 'Markdown', '导入导出'],
    defaultEnabled: true,
  },
  component: BackupExportComponent,
};
