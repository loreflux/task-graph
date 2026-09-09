'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Task, TaskRelation } from '@/types';
import { TaskNode } from './task-node';
import { TaskEdge } from './task-edge';
import { GraphToolbar } from './graph-toolbar';
import { GraphContextMenu, type ContextMenuState } from './graph-context-menu';
import { computeGraphLayout } from '@/lib/graph-layout';
import { detectCycle } from '@/lib/graph-algorithms/cycle-detection';
import { getCriticalPath } from '@/lib/graph-algorithms/critical-path';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDuration } from '@/lib/utils';
import { Zap, X } from 'lucide-react';
import { toast } from 'sonner';

const nodeTypes = {
  taskNode: TaskNode,
};

const edgeTypes = {
  taskEdge: TaskEdge,
};

const POSITIONS_STORAGE_KEY = 'task_graph_user_node_positions';

function getSavedPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(nodesList: Node[]) {
  if (typeof window === 'undefined') return;
  try {
    const posMap: Record<string, { x: number; y: number }> = getSavedPositions();
    for (const n of nodesList) {
      posMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
    }
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(posMap));
  } catch {}
}

interface TaskGraphViewProps {
  tasks: Task[];
  relations: TaskRelation[];
  blockedTaskIds?: Set<string>;
  onRefresh?: () => void;
}

function TaskGraphFlow({
  tasks,
  relations,
  blockedTaskIds = new Set(),
  onRefresh,
}: TaskGraphViewProps) {
  const { openDrawer } = useUIStore();
  const { settings } = useSettingsStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    type: 'canvas',
  });

  // Modal dialog states
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [subtaskParentTask, setSubtaskParentTask] = useState<Task | null>(null);
  const [deleteTargetTask, setDeleteTargetTask] = useState<Task | null>(null);

  // 1. Calculate Critical Path when enabled
  const { criticalPathResult, criticalNodeIds, criticalEdgeIds } = useMemo(() => {
    if (!showCriticalPath || tasks.length === 0) {
      return {
        criticalPathResult: null,
        criticalNodeIds: new Set<string>(),
        criticalEdgeIds: new Set<string>(),
      };
    }

    // Build AdjacencyList: key = taskId, value = array of dependency task IDs
    const adj = new Map<string, string[]>();
    for (const t of tasks) adj.set(t.id, []);
    for (const r of relations) {
      adj.get(r.sourceTaskId)?.push(r.targetTaskId);
    }

    // Duration map: in minutes (fallback to 30 min if not specified)
    const durations = new Map<string, number>();
    for (const t of tasks) {
      durations.set(t.id, t.estimatedDuration || 30);
    }

    const result = getCriticalPath(adj, durations);
    const nodeIds = new Set(result.path);

    // Identify edges on the critical path
    const edgeIds = new Set<string>();
    for (let i = 0; i < result.path.length - 1; i++) {
      const pred = result.path[i];
      const succ = result.path[i + 1];
      // relation has targetTaskId=pred (dependency) and sourceTaskId=succ (dependent)
      const rel = relations.find(
        (r) => r.targetTaskId === pred && r.sourceTaskId === succ,
      );
      if (rel) {
        edgeIds.add(rel.id);
      }
    }

    return {
      criticalPathResult: result,
      criticalNodeIds: nodeIds,
      criticalEdgeIds: edgeIds,
    };
  }, [showCriticalPath, tasks, relations]);

  // 2. Filter tasks based on view toggles
  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (hideCompleted) {
      list = list.filter((t) => t.status !== 'DONE');
    }
    if (showBlockedOnly) {
      list = list.filter(
        (t) => t.status === 'BLOCKED' || blockedTaskIds.has(t.id),
      );
    }
    return list;
  }, [tasks, hideCompleted, showBlockedOnly, blockedTaskIds]);

  // 3. Compute layered layout coordinates
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return computeGraphLayout(
      filteredTasks,
      relations,
      blockedTaskIds,
      criticalNodeIds,
      criticalEdgeIds,
    );
  }, [filteredTasks, relations, blockedTaskIds, criticalNodeIds, criticalEdgeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);

  // Delete edge action handler
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      const res = await dataAdapter.removeDependency(edgeId);
      if (res.success) {
        toast.success('已删除依赖连线');
        onRefresh?.();
      } else {
        toast.error(res.error || '删除依赖连线失败');
      }
    },
    [onRefresh],
  );

  // Save node positions on drag stop
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    setNodes((currentNodes) => {
      savePositions(currentNodes);
      return currentNodes;
    });
  }, [setNodes]);

  // Update nodes and edges while respecting user position preference
  useEffect(() => {
    const savedPositions = getSavedPositions();
    setNodes((prevNodes) => {
      const currentPosMap = new Map<string, { x: number; y: number }>();
      for (const pn of prevNodes) {
        currentPosMap.set(pn.id, pn.position);
      }

      return initialNodes.map((n) => {
        // If user explicitly enabled auto layout on data change, take newly computed layout
        if (settings.autoLayoutOnDataChange) {
          return n;
        }
        // Otherwise, preserve user dragged/custom coordinates
        const saved = currentPosMap.get(n.id) || savedPositions[n.id];
        if (saved) {
          return {
            ...n,
            position: saved,
          };
        }
        return n;
      }) as Node[];
    });

    // Construct custom edges with taskEdge and interactive delete callback
    const customEdges = initialEdges.map((e) => {
      const rel = relations.find((r) => r.id === e.id);
      const sourceTask = tasks.find((t) => t.id === rel?.targetTaskId);
      const targetTask = tasks.find((t) => t.id === rel?.sourceTaskId);
      return {
        ...e,
        type: 'taskEdge',
        data: {
          ...e.data,
          sourceTitle: sourceTask?.title,
          targetTitle: targetTask?.title,
          onDelete: handleDeleteEdge,
        },
      };
    });
    setEdges(customEdges as Edge[]);
  }, [
    initialNodes,
    initialEdges,
    settings.autoLayoutOnDataChange,
    relations,
    tasks,
    handleDeleteEdge,
    setNodes,
    setEdges,
  ]);

  // 4. Handle connecting a new dependency edge
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const dependentId = connection.target;
      const dependencyId = connection.source;

      if (dependentId === dependencyId) {
        toast.error('不能将任务依赖于自身');
        return;
      }

      // Pre-check cycle on client
      const adj = new Map<string, string[]>();
      for (const t of tasks) adj.set(t.id, []);
      for (const r of relations) {
        adj.get(r.sourceTaskId)?.push(r.targetTaskId);
      }

      const cycleCheck = detectCycle(adj, dependentId, dependencyId);
      if (cycleCheck.hasCycle) {
        const pathStr = cycleCheck.cyclePath ? cycleCheck.cyclePath.join(' → ') : '';
        toast.error(`无法建立依赖关系：会形成循环依赖！\n路径: ${pathStr}`);
        return;
      }

      const res = await dataAdapter.addDependency(dependentId, dependencyId);
      if (!res.success) {
        toast.error(res.error || '添加依赖失败');
        return;
      }

      toast.success('已成功建立前置依赖关系');
      setEdges((eds) => addEdge(connection, eds));
      onRefresh?.();
    },
    [tasks, relations, setEdges, onRefresh],
  );

  // 5. Handle edge deletion (keyboard Delete/Backspace or selection removal)
  const onEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        await handleDeleteEdge(edge.id);
      }
    },
    [handleDeleteEdge],
  );

  // 6. Handle node click -> open detail drawer with immediate task data
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setContextMenu((prev) => ({ ...prev, open: false }));
      const task = (node.data as any)?.task as Task;
      openDrawer(node.id, task);
    },
    [openDrawer],
  );

  // 7. Right-click on blank canvas
  const onPaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      type: 'canvas',
    });
  }, []);

  // 8. Right-click on node
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      e.stopPropagation();
      const task = (node.data as any)?.task as Task;
      setContextMenu({
        open: true,
        x: e.clientX,
        y: e.clientY,
        type: 'node',
        task,
      });
    },
    [],
  );

  // 8.1 Right-click on edge
  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      e.stopPropagation();
      const rel = relations.find((r) => r.id === edge.id);
      const sourceTask = tasks.find((t) => t.id === rel?.targetTaskId);
      const targetTask = tasks.find((t) => t.id === rel?.sourceTaskId);
      const label =
        sourceTask && targetTask
          ? `${sourceTask.title} → ${targetTask.title}`
          : undefined;
      setContextMenu({
        open: true,
        x: e.clientX,
        y: e.clientY,
        type: 'edge',
        edgeId: edge.id,
        edgeLabel: label,
      });
    },
    [relations, tasks],
  );

  // 9. 一键拓扑整理 action
  const handleAutoLayout = useCallback(() => {
    const layout = computeGraphLayout(
      filteredTasks,
      relations,
      blockedTaskIds,
      criticalNodeIds,
      criticalEdgeIds,
    );
    setNodes(layout.nodes as Node[]);
    savePositions(layout.nodes as Node[]);

    const customEdges = layout.edges.map((e) => {
      const rel = relations.find((r) => r.id === e.id);
      const sourceTask = tasks.find((t) => t.id === rel?.targetTaskId);
      const targetTask = tasks.find((t) => t.id === rel?.sourceTaskId);
      return {
        ...e,
        type: 'taskEdge',
        data: {
          ...e.data,
          sourceTitle: sourceTask?.title,
          targetTitle: targetTask?.title,
          onDelete: handleDeleteEdge,
        },
      };
    });
    setEdges(customEdges as Edge[]);

    setTimeout(() => {
      fitView({ duration: 500, padding: 0.15 });
      toast.success('已完成一键拓扑整理');
    }, 50);
  }, [
    filteredTasks,
    relations,
    blockedTaskIds,
    criticalNodeIds,
    criticalEdgeIds,
    tasks,
    handleDeleteEdge,
    setNodes,
    setEdges,
    fitView,
  ]);

  // Quick task actions
  const handleCreateTaskConfirm = async (title: string) => {
    const res = await dataAdapter.createTask({
      title,
      status: 'TODO',
    });
    if (res.success) {
      toast.success(`已创建新节点: ${title}`);
      onRefresh?.();
    } else {
      toast.error(res.error || '创建任务失败');
    }
  };

  const handleToggleNodeStatus = async (task: Task) => {
    if (task.status === 'DONE') {
      const res = await dataAdapter.uncompleteTask(task.id);
      if (res.success) {
        toast.success('已恢复为未完成待办');
        onRefresh?.();
      }
    } else {
      const res = await dataAdapter.completeTask(task.id, 'SINGLE');
      if (res.success) {
        toast.success('已标记任务为完成');
        onRefresh?.();
      }
    }
  };

  const handleAddSubtaskConfirm = async (title: string) => {
    if (!subtaskParentTask) return;
    const res = await dataAdapter.createTask({
      title,
      parentId: subtaskParentTask.id,
      projectId: subtaskParentTask.projectId,
      status: 'TODO',
    });
    if (res.success) {
      toast.success(`已在 "${subtaskParentTask.title}" 下创建子任务`);
      onRefresh?.();
    }
  };

  const handleDeleteTaskConfirm = async () => {
    if (!deleteTargetTask) return;
    const res = await dataAdapter.deleteTask(deleteTargetTask.id);
    if (res.success) {
      toast.success('已移入回收站');
      onRefresh?.();
    }
  };

  return (
    <div className="relative h-full w-full bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls className="!border-zinc-800 !bg-zinc-900/90 fill-zinc-300" />
        <MiniMap
          nodeColor={(node) => {
            const task = (node.data as any)?.task as Task;
            const isCrit = (node.data as any)?.isCriticalPath;
            if (isCrit) return '#f59e0b';
            if (task?.status === 'DONE') return '#22c55e';
            if (task?.status === 'BLOCKED') return '#ef4444';
            if (task?.status === 'IN_PROGRESS') return '#f59e0b';
            return '#3b82f6';
          }}
          className="!rounded-lg !border !border-zinc-800 !bg-zinc-900/80"
        />

        {/* Top-right floating controls toolbar */}
        <Panel position="top-right" className="m-4">
          <GraphToolbar
            onAutoLayout={handleAutoLayout}
            onFitView={() => fitView({ duration: 300, padding: 0.15 })}
            showCriticalPath={showCriticalPath}
            onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
            showBlockedOnly={showBlockedOnly}
            onToggleBlockedOnly={() => setShowBlockedOnly(!showBlockedOnly)}
            hideCompleted={hideCompleted}
            onToggleHideCompleted={() => setHideCompleted(!hideCompleted)}
          />
        </Panel>

        {/* Critical Path Floating Highlight Banner */}
        {showCriticalPath && criticalPathResult && criticalPathResult.path.length > 0 && (
          <Panel position="top-center" className="mt-4">
            <div className="flex items-center gap-2.5 rounded-full border border-amber-500/50 bg-amber-950/90 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-3">
              <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>
                关键路径已高亮：共 <strong>{criticalPathResult.path.length}</strong> 个核心节点，预计累计工期{' '}
                <strong>{formatDuration(criticalPathResult.totalDuration)}</strong>
              </span>
              <button
                onClick={() => setShowCriticalPath(false)}
                className="ml-1 rounded p-0.5 text-amber-400/80 hover:text-amber-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Right-click Context Menu */}
      <GraphContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, open: false }))}
        onCreateTask={() => setCreateTaskOpen(true)}
        onAutoLayout={handleAutoLayout}
        onFitView={() => fitView({ duration: 300, padding: 0.15 })}
        onOpenDetail={(id) => openDrawer(id)}
        onToggleStatus={handleToggleNodeStatus}
        onAddSubtask={(task) => setSubtaskParentTask(task)}
        onDeleteTask={(task) => setDeleteTargetTask(task)}
        onDeleteEdge={handleDeleteEdge}
      />

      {/* Modal Dialog for Canvas Right-Click: Create Task */}
      <PromptDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        title="新建任务节点"
        description="在依赖图谱中创建新任务节点，创建后可通过拖拽右侧圆点连接建立时序依赖"
        placeholder="输入任务标题..."
        confirmText="创建节点"
        onConfirm={handleCreateTaskConfirm}
      />

      {/* Modal Dialog for Node Right-Click: Add Subtask */}
      <PromptDialog
        open={!!subtaskParentTask}
        onOpenChange={(open) => !open && setSubtaskParentTask(null)}
        title="添加分解子任务"
        description={
          subtaskParentTask
            ? `在父任务 "${subtaskParentTask.title}" 下添加分解子任务`
            : undefined
        }
        placeholder="输入子任务标题..."
        confirmText="添加子任务"
        onConfirm={handleAddSubtaskConfirm}
      />

      {/* Confirm Dialog for Node Right-Click: Delete Task */}
      <ConfirmDialog
        open={!!deleteTargetTask}
        onOpenChange={(open) => !open && setDeleteTargetTask(null)}
        title="移至回收站"
        description={
          deleteTargetTask
            ? `确定要将任务 "${deleteTargetTask.title}" 移入回收站吗？之后可在回收站随时恢复。`
            : ''
        }
        variant="danger"
        confirmText="移入回收站"
        cancelText="取消"
        onConfirm={handleDeleteTaskConfirm}
      />
    </div>
  );
}

export function TaskGraphView(props: TaskGraphViewProps) {
  return (
    <ReactFlowProvider>
      <TaskGraphFlow {...props} />
    </ReactFlowProvider>
  );
}
