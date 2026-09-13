'use client';

import React, { useState, useMemo } from 'react';
import type { Task, TaskRelation } from '@/types';
import { exportToMermaid, exportToJson } from '@/lib/mermaid-export';
import { Copy, Check, Download, X, Code2, FileJson, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';

interface GraphExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  relations: TaskRelation[];
}

export function GraphExportDialog({
  open,
  onOpenChange,
  tasks,
  relations,
}: GraphExportDialogProps) {
  const [tab, setTab] = useState<'mermaid' | 'json'>('mermaid');
  const [copied, setCopied] = useState(false);

  const mermaidCode = useMemo(() => exportToMermaid(tasks, relations), [tasks, relations]);
  const jsonCode = useMemo(() => exportToJson(tasks, relations), [tasks, relations]);

  const activeContent = tab === 'mermaid' ? mermaidCode : jsonCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      toast.success(tab === 'mermaid' ? '已复制 Mermaid 代码' : '已复制 JSON 数据');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };

  const handleDownload = () => {
    const filename = tab === 'mermaid' ? 'task-graph.mmd' : 'task-graph.json';
    const mime = tab === 'mermaid' ? 'text/plain' : 'application/json';
    const blob = new Blob([activeContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`已开始下载 ${filename}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">导出任务依赖图谱</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                支持导出为标准 Mermaid 流程图或结构化 JSON，兼容 Markdown、Obsidian 及 AI 对话
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              onClick={() => setTab('mermaid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === 'mermaid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Mermaid 代码</span>
            </button>
            <button
              onClick={() => setTab('json')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === 'json'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>标准 JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? '已复制' : '复制到剪贴板'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition shadow-md"
            >
              <Download className="h-3.5 w-3.5" />
              <span>下载文件</span>
            </button>
          </div>
        </div>

        {/* Code view area / Export & Download area when nodes are excessive */}
        <div className="relative mt-2 flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
          {tasks.length > 30 || activeContent.length > 5000 ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="rounded-full bg-blue-500/10 p-3.5 text-blue-400 border border-blue-500/20">
                <Download className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-zinc-100">
                  节点数量较多（共 {tasks.length} 个节点，{relations.length} 条连线）
                </h4>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                  检测到节点数量较多，为保障性能已省略纯文本渲染。请直接通过导出下载选项获取文件：
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-900/30 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>立即下载 {tab === 'mermaid' ? 'Mermaid 代码 (.mmd)' : '标准 JSON 数据 (.json)'}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? '已复制内容' : '复制数据到剪贴板'}</span>
                </button>
              </div>
            </div>
          ) : (
            <pre className="h-full max-h-[380px] overflow-auto p-4 font-mono text-xs text-zinc-300 leading-relaxed selection:bg-blue-900 selection:text-white">
              <code>{activeContent}</code>
            </pre>
          )}
        </div>

        {/* Bottom footer tip */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>
              {tab === 'mermaid'
                ? '提示：可直接粘贴至支持 Mermaid 的 Markdown 渲染器或投给 LLM 进行流程逻辑分析'
                : '提示：包含任务全量元数据与前置/后置依赖拓扑关系'}
            </span>
          </span>
          <span>
            共 <strong>{tasks.length}</strong> 个节点，<strong>{relations.length}</strong> 条连线
          </span>
        </div>
      </div>
    </div>
  );
}
