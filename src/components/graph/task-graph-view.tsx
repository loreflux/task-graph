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
import { GraphToolbar } from './graph-toolbar';
import { computeGraphLayout } from '@/lib/graph-layout';
import { detectCycle } from '@/lib/graph-algorithms/cycle-detection';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';

const nodeTypes = {
  taskNode: TaskNode,
};

interface TaskGraphViewProps {
  tasks: Task[];
  relations: TaskRelation[];
  blockedTaskIds?: Set<string>;
  onRefresh?: () => void;
  onCreateTask?: () => void;
}

function TaskGraphFlow({
  tasks,
  relations,
  blockedTaskIds = new Set(),
  onRefresh,
  onCreateTask,
}: TaskGraphViewProps) {
  const { openDrawer } = useUIStore();
  const { fitView } = useReactFlow();

  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Filter tasks based on toggles
  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (hideCompleted) {
      list = list.filter((t) => t.status !== 'DONE');
    }
    if (showBlockedOnly) {
      list = list.filter((t) => t.status === 'BLOCKED' || blockedTaskIds.has(t.id));
    }
    return list;
  }, [tasks, hideCompleted, showBlockedOnly, blockedTaskIds]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return computeGraphLayout(filteredTasks, relations, blockedTaskIds);
  }, [filteredTasks, relations, blockedTaskIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);

  useEffect(() => {
    setNodes(initialNodes as Node[]);
    setEdges(initialEdges as Edge[]);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle adding a new dependency edge by dragging between handles
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // In our model: source in ReactFlow is the handle on the right of dependency
      // target in ReactFlow is the handle on the left of dependent
      // Dependency: target depends on source.
      // sourceTaskId = connection.target (the dependent task)
      // targetTaskId = connection.source (the prerequisite task)
      const dependentId = connection.target;
      const dependencyId = connection.source;

      if (dependentId === dependencyId) {
        toast.error('不能将任务依赖于自身');
        return;
      }

      // Pre-check cycle using graph algorithm on client
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

      // Call adapter to persist (LocalStorage or PostgreSQL)
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

  // Handle edge removal
  const onEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        const res = await dataAdapter.removeDependency(edge.id);
        if (!res.success) {
          toast.error(res.error || '删除依赖关系失败');
        } else {
          toast.success('已删除依赖关系');
        }
      }
      onRefresh?.();
    },
    [onRefresh],
  );

  // Handle node click to open detail drawer
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      openDrawer(node.id);
    },
    [openDrawer],
  );

  // Auto layout action
  const handleAutoLayout = useCallback(() => {
    const layout = computeGraphLayout(filteredTasks, relations, blockedTaskIds);
    setNodes(layout.nodes as Node[]);
    setEdges(layout.edges as Edge[]);
    setTimeout(() => fitView({ duration: 400 }), 50);
  }, [filteredTasks, relations, blockedTaskIds, setNodes, setEdges, fitView]);

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
        nodeTypes={nodeTypes}
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
            if (task?.status === 'DONE') return '#22c55e';
            if (task?.status === 'BLOCKED') return '#ef4444';
            if (task?.status === 'IN_PROGRESS') return '#f59e0b';
            return '#3b82f6';
          }}
          className="!rounded-lg !border !border-zinc-800 !bg-zinc-900/80"
        />

        <Panel position="top-right" className="m-4">
          <GraphToolbar
            onAutoLayout={handleAutoLayout}
            onFitView={() => fitView({ duration: 300 })}
            showCriticalPath={showCriticalPath}
            onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
            showBlockedOnly={showBlockedOnly}
            onToggleBlockedOnly={() => setShowBlockedOnly(!showBlockedOnly)}
            hideCompleted={hideCompleted}
            onToggleHideCompleted={() => setHideCompleted(!hideCompleted)}
            onCreateTask={() => onCreateTask?.()}
          />
        </Panel>
      </ReactFlow>
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
