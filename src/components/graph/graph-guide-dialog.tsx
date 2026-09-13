'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  HelpCircle,
  Move,
  GitBranch,
  MousePointer,
  Command,
} from 'lucide-react';

interface GraphGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraphGuideDialog({ open, onOpenChange }: GraphGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950/98 p-6 text-zinc-200 sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-blue-400">
            <HelpCircle className="h-5 w-5" />
            <DialogTitle className="text-base font-semibold text-zinc-100">
              图谱画布操作指南
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            掌握以下操作技巧与快捷键，更高效地在可视化拓扑图谱中编排您的任务流程。
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6 text-xs">
          {/* Section 1: 节点操作 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <MousePointer className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold">任务节点操作</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1">
                <span className="font-semibold text-zinc-200">单击节点</span>
                <p className="text-zinc-400">
                  打开右侧详情抽屉，支持查看与修改任务标题、描述、优先级、预计工期与起止排期。
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1">
                <span className="font-semibold text-zinc-200">拖拽节点</span>
                <p className="text-zinc-400">
                  鼠标按住节点卡片可自由挪动位置，系统会自动持久化记忆每个节点的坐标布局。
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1 sm:col-span-2">
                <span className="font-semibold text-zinc-200">右键节点快捷菜单</span>
                <p className="text-zinc-400 leading-relaxed">
                  右键点击任一节点卡片即可唤出快捷菜单，支持：
                  <span className="text-zinc-300"> 快速切换完成状态</span>、
                  <span className="text-zinc-300"> 衍生后续/前置依赖任务（自动连线）</span>、
                  <span className="text-zinc-300"> 添加分解子任务</span>、
                  <span className="text-zinc-300"> 设置 6 色分类标记</span> 以及
                  <span className="text-zinc-300"> 安全移入回收站</span>。
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: 连线与依赖操作 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <GitBranch className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold">连线与依赖关系</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1">
                <span className="font-semibold text-zinc-200">创建依赖连线</span>
                <p className="text-zinc-400">
                  鼠标从前置任务卡片<strong className="text-zinc-200">右侧圆点</strong>按住拖出连线，释放至后续任务卡片<strong className="text-zinc-200">左侧圆点</strong>即可建立依赖。
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1">
                <span className="font-semibold text-zinc-200">删除连线</span>
                <p className="text-zinc-400">
                  鼠标右键单击目标连线选择“删除连线”，或左键选中连线后按下 <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">Delete</kbd> 键。
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1 sm:col-span-2">
                <span className="font-semibold text-zinc-200">环路死锁保护</span>
                <p className="text-zinc-400 leading-relaxed">
                  系统内置 Kahn 拓扑排序与 DFS 环路检测，若连线会导致死锁循环，系统将自动阻止并提示环路路径。
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: 画布与视野控制 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Move className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold">画布视野与导航</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1">
                <span className="font-semibold text-zinc-200">平移与缩放</span>
                <p className="text-zinc-400">
                  滚轮缩放画布；在空白处按住鼠标左键或按下中键拖拽可无缝平移漫游视野。
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-1">
                <span className="font-semibold text-zinc-200">一键拓扑整理</span>
                <p className="text-zinc-400">
                  点击顶部“一键拓扑整理”按钮，系统将根据依赖层级时序深度自动重新排列所有节点。
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: 常用快捷键 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Command className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold">常用快捷键</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2.5 text-center space-y-1">
                <kbd className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-200">
                  Ctrl + Z
                </kbd>
                <p className="text-[11px] text-zinc-400">撤销上一步操作</p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2.5 text-center space-y-1">
                <kbd className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-200">
                  Ctrl + F
                </kbd>
                <p className="text-[11px] text-zinc-400">画布搜索与聚焦</p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2.5 text-center space-y-1">
                <kbd className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-200">
                  Ctrl + K
                </kbd>
                <p className="text-[11px] text-zinc-400">全局命令面板</p>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2.5 text-center space-y-1">
                <kbd className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-200">
                  Delete / Backspace
                </kbd>
                <p className="text-[11px] text-zinc-400">删除选中项</p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
