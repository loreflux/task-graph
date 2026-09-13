'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
import { GraphCuttingOverlay } from './graph-cutting-overlay';
import { GraphSearchBar } from './graph-search-bar';
import { GraphExportDialog } from './graph-export-dialog';
import { lineSegmentsIntersect } from '@/lib/cutting-math';
import { computeGraphLayout } from '@/lib/graph-layout';
import { detectCycle } from '@/lib/graph-algorithms/cycle-detection';
import { getCriticalPath } from '@/lib/graph-algorithms/critical-path';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUndoStore } from '@/stores/undo-store';
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
const COLORS_STORAGE_KEY = 'task_graph_user_node_colors';

function getSavedPositions(projectId?: string | null): Record<string, { x: number; y: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const key = projectId ? `task_graph_user_node_positions_${projectId}` : POSITIONS_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(nodesList: Node[], projectId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const key = projectId ? `task_graph_user_node_positions_${projectId}` : POSITIONS_STORAGE_KEY;
    const posMap: Record<string, { x: number; y: number }> = getSavedPositions(projectId);
    for (const n of nodesList) {
      posMap[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
    }
    localStorage.setItem(key, JSON.stringify(posMap));
  } catch {}
}

function getSavedColors(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COLORS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveColors(colors: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(colors));
  } catch {}
}

const EMPTY_ID_SET = new Set<string>();

interface TaskGraphViewProps {
  tasks: Task[];
  relations: TaskRelation[];
  blockedTaskIds?: Set<string>;
  projectId?: string | null;
  onRefresh?: () => void;
}

function TaskGraphFlow({
  tasks,
  relations,
  blockedTaskIds = EMPTY_ID_SET,
  projectId = null,
  onRefresh,
}: TaskGraphViewProps) {
  const { openDrawer } = useUIStore();
  const { settings } = useSettingsStore();
  const { pushAction, undo, canUndo, lastActionDescription } = useUndoStore();
  const { fitView, setCenter, screenToFlowPosition } = useReactFlow();

  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Custom node color mapping (persisted in localStorage)
  const [nodeColors, setNodeColors] = useState<Record<string, string>>(() => getSavedColors());

  // Canvas search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchedNodeIds, setMatchedNodeIds] = useState<Set<string>>(EMPTY_ID_SET);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Export diagram dialog state
  const [exportOpen, setExportOpen] = useState(false);

  // Spawning dependent/prerequisite task state
  const [spawnConfig, setSpawnConfig] = useState<{
    task: Task;
    direction: 'PREV' | 'NEXT';
  } | null>(null);

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

  // Handle undo action
  const handleUndo = useCallback(async () => {
    const desc = lastActionDescription;
    const success = await undo();
    if (success) {
      toast.success(`已撤销：${desc || '上一步操作'}`);
      onRefresh?.();
    } else {
      toast.info('暂无可撤销的操作');
    }
  }, [undo, lastActionDescription, onRefresh]);

  // Global Ctrl+Z / Cmd+Z and Ctrl+F / Cmd+F shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Click on blank pane: immediately close context menu
  const onPaneClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  // Right-click cutting (slicing) state
  const [isCutting, setIsCutting] = useState(false);
  const [cutPoints, setCutPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [severedCount, setSeveredCount] = useState(0);

  const isRmbDownRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRmbRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const severedEdgesRef = useRef<Set<string>>(new Set());

  interface CachedEdge {
    id: string;
    segments: Array<[{ x: number; y: number }, { x: number; y: number }]>;
    bbox: { left: number; top: number; right: number; bottom: number };
  }
  const edgeCacheRef = useRef<CachedEdge[] | null>(null);

  const buildEdgeCache = useCallback((): CachedEdge[] => {
    const result: CachedEdge[] = [];
    for (const rel of relations) {
      const el =
        (document.getElementById(rel.id) as SVGPathElement | null) ||
        document.querySelector<SVGPathElement>(`[data-id="${rel.id}"] path.react-flow__edge-path`) ||
        document.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${rel.id}"] path`);
      if (!el || typeof el.getTotalLength !== 'function') continue;

      try {
        const totalLen = el.getTotalLength();
        if (totalLen <= 0) continue;

        const rect = el.getBoundingClientRect();
        const ctm = el.getScreenCTM();
        if (!ctm) continue;

        const samples = 16;
        const points: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= samples; i++) {
          const dist = (i / samples) * totalLen;
          const svgPt = el.getPointAtLength(dist);
          const screenPt = svgPt.matrixTransform(ctm);
          points.push({ x: screenPt.x, y: screenPt.y });
        }

        const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
        for (let i = 0; i < points.length - 1; i++) {
          segments.push([points[i], points[i + 1]]);
        }

        result.push({
          id: rel.id,
          segments,
          bbox: {
            left: rect.left - 6,
            top: rect.top - 6,
            right: rect.right + 6,
            bottom: rect.bottom + 6,
          },
        });
      } catch {}
    }
    return result;
  }, [relations]);

  const restoreEdgeStyles = useCallback(() => {
    for (const edgeId of severedEdgesRef.current) {
      const el =
        (document.getElementById(edgeId) as SVGPathElement | null) ||
        document.querySelector<SVGPathElement>(
          `[data-id="${edgeId}"] path.react-flow__edge-path`,
        ) ||
        document.querySelector<SVGPathElement>(
          `.react-flow__edge[data-id="${edgeId}"] path`,
        );
      if (el) {
        el.style.stroke = '';
        el.style.strokeWidth = '';
        el.style.strokeDasharray = '';
        el.style.filter = '';
        el.style.opacity = '';
      }
    }
  }, []);

  const checkIntersections = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const cache = edgeCacheRef.current;
      if (!cache) return;

      const segMinX = Math.min(p1.x, p2.x);
      const segMaxX = Math.max(p1.x, p2.x);
      const segMinY = Math.min(p1.y, p2.y);
      const segMaxY = Math.max(p1.y, p2.y);

      let newlySevered = false;

      for (const edge of cache) {
        if (severedEdgesRef.current.has(edge.id)) continue;

        if (
          segMaxX < edge.bbox.left ||
          segMinX > edge.bbox.right ||
          segMaxY < edge.bbox.top ||
          segMinY > edge.bbox.bottom
        ) {
          continue;
        }

        for (const [sA, sB] of edge.segments) {
          if (
            lineSegmentsIntersect(
              p1.x,
              p1.y,
              p2.x,
              p2.y,
              sA.x,
              sA.y,
              sB.x,
              sB.y,
            )
          ) {
            severedEdgesRef.current.add(edge.id);
            newlySevered = true;

            const el =
              (document.getElementById(edge.id) as SVGPathElement | null) ||
              document.querySelector<SVGPathElement>(
                `[data-id="${edge.id}"] path.react-flow__edge-path`,
              ) ||
              document.querySelector<SVGPathElement>(
                `.react-flow__edge[data-id="${edge.id}"] path`,
              );
            if (el) {
              el.style.stroke = '#ef4444';
              el.style.strokeWidth = '3.5px';
              el.style.strokeDasharray = '6,4';
              el.style.filter = 'drop-shadow(0 0 10px #ef4444)';
              el.style.opacity = '0.7';
            }
            break;
          }
        }
      }

      if (newlySevered) {
        setSeveredCount(severedEdgesRef.current.size);
      }
    },
    [],
  );

  const executeCutEdges = useCallback(
    async (edgeIds: string[]) => {
      const relationsToRestore: TaskRelation[] = [];
      for (const id of edgeIds) {
        const rel = relations.find((r) => r.id === id);
        if (rel) {
          relationsToRestore.push({ ...rel });
        }
        await dataAdapter.removeDependency(id);
      }

      if (relationsToRestore.length > 0) {
        const first = relationsToRestore[0];
        const srcTask = tasks.find((t) => t.id === first.targetTaskId);
        const tgtTask = tasks.find((t) => t.id === first.sourceTaskId);
        const singleDesc = srcTask && tgtTask ? `「${srcTask.title} → ${tgtTask.title}」` : '';

        const actionDesc =
          relationsToRestore.length === 1
            ? `切断依赖连线 ${singleDesc}`
            : `切断 ${relationsToRestore.length} 条依赖连线`;

        pushAction({
          description: actionDesc,
          undo: async () => {
            for (const rel of relationsToRestore) {
              await dataAdapter.addDependency(
                rel.sourceTaskId,
                rel.targetTaskId,
                rel.description || undefined,
              );
            }
            onRefresh?.();
          },
        });

        toast.success(actionDesc);
        onRefresh?.();
      }
    },
    [relations, tasks, pushAction, onRefresh],
  );

  // Global right-drag pointer listener for cutting wires
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 2) return;
      const target = e.target as HTMLElement | null;
      const inGraph = target?.closest('.react-flow, .react-flow__pane, .react-flow__edge, .react-flow__node');
      if (!inGraph) return;
      if (target?.closest?.('[role="dialog"], input, textarea, .detail-drawer')) return;

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      isRmbDownRef.current = true;
      hasDraggedRmbRef.current = false;
      severedEdgesRef.current.clear();
      edgeCacheRef.current = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isRmbDownRef.current || !dragStartRef.current) return;

      const dist = Math.hypot(
        e.clientX - dragStartRef.current.x,
        e.clientY - dragStartRef.current.y,
      );

      if (!hasDraggedRmbRef.current) {
        if (dist > 8) {
          hasDraggedRmbRef.current = true;
          setIsCutting(true);
          edgeCacheRef.current = buildEdgeCache();
          const startPt = { ...dragStartRef.current };
          const currPt = { x: e.clientX, y: e.clientY };
          setCutPoints([startPt, currPt]);
          lastPtRef.current = currPt;
          checkIntersections(startPt, currPt);
        }
      } else {
        const currPt = { x: e.clientX, y: e.clientY };
        const prevPt = lastPtRef.current || currPt;
        lastPtRef.current = currPt;

        setCutPoints((prev) => [...prev, currPt]);
        checkIntersections(prevPt, currPt);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button !== 2) return;
      if (!isRmbDownRef.current) return;

      isRmbDownRef.current = false;

      if (hasDraggedRmbRef.current) {
        const toDelete = Array.from(severedEdgesRef.current);
        if (toDelete.length > 0) {
          executeCutEdges(toDelete);
        }

        setTimeout(() => {
          hasDraggedRmbRef.current = false;
        }, 150);
      }

      setIsCutting(false);
      setCutPoints([]);
      setSeveredCount(0);
      edgeCacheRef.current = null;
      dragStartRef.current = null;
      lastPtRef.current = null;
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (hasDraggedRmbRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCutting) {
        isRmbDownRef.current = false;
        hasDraggedRmbRef.current = false;
        setIsCutting(false);
        setCutPoints([]);
        setSeveredCount(0);
        restoreEdgeStyles();
        severedEdgesRef.current.clear();
        edgeCacheRef.current = null;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [buildEdgeCache, checkIntersections, executeCutEdges, isCutting, restoreEdgeStyles]);

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

  // Delete edge action handler with undo recording
  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      const rel = relations.find((r) => r.id === edgeId);
      const sourceTask = tasks.find((t) => t.id === rel?.targetTaskId);
      const targetTask = tasks.find((t) => t.id === rel?.sourceTaskId);
      const relDesc = sourceTask && targetTask ? `「${sourceTask.title} → ${targetTask.title}」` : '';
      const prevRel = rel ? { ...rel } : null;

      const res = await dataAdapter.removeDependency(edgeId);
      if (res.success) {
        if (prevRel) {
          pushAction({
            description: `删除依赖连线 ${relDesc}`,
            undo: async () => {
              await dataAdapter.addDependency(
                prevRel.sourceTaskId,
                prevRel.targetTaskId,
                prevRel.description || undefined,
              );
            },
          });
        }
        toast.success('已删除依赖连线');
        onRefresh?.();
      } else {
        toast.error(res.error || '删除依赖连线失败');
      }
    },
    [relations, tasks, pushAction, onRefresh],
  );

  // Keep track of positions at drag start to enable undoing node movements
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onNodeDragStart = useCallback((_: any, node: Node, draggedNodes?: Node[]) => {
    const map = new Map<string, { x: number; y: number }>();
    const targetNodes = draggedNodes && draggedNodes.length > 0 ? draggedNodes : [node];
    for (const n of targetNodes) {
      map.set(n.id, { x: n.position.x, y: n.position.y });
    }
    dragStartPositionsRef.current = map;
  }, []);

  // Save node positions on drag stop and push undo action
  const onNodeDragStop = useCallback(
    (_: any, node: Node, draggedNodes?: Node[]) => {
      const savedPositions = getSavedPositions(projectId);
      const startMap = dragStartPositionsRef.current;
      const targetNodes = draggedNodes && draggedNodes.length > 0 ? draggedNodes : [node];

      let hasMoved = false;
      const oldPositions: Array<{ id: string; position: { x: number; y: number } }> = [];
      const newPositions: Array<{ id: string; position: { x: number; y: number } }> = [];

      for (const n of targetNodes) {
        const startPos = startMap.get(n.id) || savedPositions[n.id];
        if (startPos) {
          const dx = Math.abs(startPos.x - n.position.x);
          const dy = Math.abs(startPos.y - n.position.y);
          if (dx > 2 || dy > 2) {
            hasMoved = true;
          }
          oldPositions.push({ id: n.id, position: { ...startPos } });
          newPositions.push({ id: n.id, position: { ...n.position } });
        }
      }

      // Persist all current nodes' positions to localStorage
      setNodes((currentNodes) => {
        savePositions(currentNodes, projectId);
        return currentNodes;
      });

      // Record undo action if node(s) actually moved
      if (hasMoved && oldPositions.length > 0) {
        const task = (node.data as any)?.task || tasks.find((t) => t.id === node.id);
        const nodeTitle = task?.title ? `"${task.title}"` : '任务节点';
        const actionDesc =
          oldPositions.length === 1
            ? `移动节点 ${nodeTitle}`
            : `移动 ${oldPositions.length} 个节点`;

        pushAction({
          description: actionDesc,
          undo: () => {
            setNodes((currentNodes) => {
              const updated = currentNodes.map((cn) => {
                const found = oldPositions.find((op) => op.id === cn.id);
                return found ? { ...cn, position: { ...found.position } } : cn;
              });
              savePositions(updated, projectId);
              return updated;
            });
          },
          redo: () => {
            setNodes((currentNodes) => {
              const updated = currentNodes.map((cn) => {
                const found = newPositions.find((np) => np.id === cn.id);
                return found ? { ...cn, position: { ...found.position } } : cn;
              });
              savePositions(updated, projectId);
              return updated;
            });
          },
        });
      }

      dragStartPositionsRef.current.clear();
    },
    [tasks, pushAction, setNodes, projectId],
  );

  // Update nodes and edges while respecting user position preference
  useEffect(() => {
    const savedPositions = getSavedPositions(projectId);
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

  // Dynamically decorate nodes for ReactFlow with color coding and search highlights without triggering setState cycles
  const decoratedNodes = useMemo(() => {
    const searchActive = searchOpen && matchedNodeIds.size > 0;
    return nodes.map((n) => {
      const customColor = nodeColors[n.id];
      const isSearchMatched = searchOpen && matchedNodeIds.has(n.id);
      const isSearchFocused = searchOpen && focusedNodeId === n.id;

      const currentData = n.data as any;
      if (
        currentData?.customColor === customColor &&
        currentData?.isSearchMatched === isSearchMatched &&
        currentData?.isSearchFocused === isSearchFocused &&
        currentData?.searchActive === searchActive
      ) {
        return n;
      }

      return {
        ...n,
        data: {
          ...n.data,
          customColor,
          isSearchMatched,
          isSearchFocused,
          searchActive,
        },
      };
    });
  }, [nodes, nodeColors, searchOpen, matchedNodeIds, focusedNodeId]);

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

      const relId = res.data?.id;
      const depTask = tasks.find((t) => t.id === dependencyId);
      const targetTask = tasks.find((t) => t.id === dependentId);
      const depDesc = depTask && targetTask ? `「${depTask.title} → ${targetTask.title}」` : '';

      if (relId) {
        pushAction({
          description: `建立依赖连线 ${depDesc}`,
          undo: async () => {
            await dataAdapter.removeDependency(relId);
          },
        });
      }

      toast.success('已成功建立前置依赖关系');
      setEdges((eds) => addEdge(connection, eds));
      onRefresh?.();
    },
    [tasks, relations, pushAction, setEdges, onRefresh],
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
    if (hasDraggedRmbRef.current) {
      e.preventDefault();
      return;
    }
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
      if (hasDraggedRmbRef.current) {
        e.preventDefault();
        return;
      }
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
      if (hasDraggedRmbRef.current) {
        e.preventDefault();
        return;
      }
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
    const prevPositions = nodes.map((n) => ({
      id: n.id,
      position: { ...n.position },
    }));

    const layout = computeGraphLayout(
      filteredTasks,
      relations,
      blockedTaskIds,
      criticalNodeIds,
      criticalEdgeIds,
    );
    setNodes(layout.nodes as Node[]);
    savePositions(layout.nodes as Node[], projectId);

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

    pushAction({
      description: '一键拓扑整理',
      undo: () => {
        setNodes((prevNodes) =>
          prevNodes.map((pn) => {
            const found = prevPositions.find((p) => p.id === pn.id);
            return found ? { ...pn, position: found.position } : pn;
          }),
        );
        savePositions(
          nodes.map((n) => {
            const found = prevPositions.find((p) => p.id === n.id);
            return found ? { ...n, position: found.position } : n;
          }),
          projectId,
        );
        setTimeout(() => {
          fitView({ duration: 300, padding: 0.15 });
        }, 50);
      },
    });

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
    nodes,
    tasks,
    handleDeleteEdge,
    pushAction,
    setNodes,
    setEdges,
    fitView,
    projectId,
  ]);

  // Quick task actions
  const handleCreateTaskConfirm = async (title: string) => {
    const res = await dataAdapter.createTask({
      title,
      status: 'TODO',
      projectId: projectId || null,
    });
    if (res.success && res.data?.id) {
      const createdId = res.data.id;
      pushAction({
        description: `新建节点 "${title}"`,
        undo: async () => {
          await dataAdapter.deleteTask(createdId, true);
        },
      });
      toast.success(`已创建新节点: ${title}`);
      onRefresh?.();
    } else if (res.success) {
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
        pushAction({
          description: `恢复待办 "${task.title}"`,
          undo: async () => {
            await dataAdapter.completeTask(task.id, 'SINGLE');
          },
        });
        toast.success('已恢复为未完成待办');
        onRefresh?.();
      }
    } else {
      const res = await dataAdapter.completeTask(task.id, 'SINGLE');
      if (res.success) {
        pushAction({
          description: `完成任务 "${task.title}"`,
          undo: async () => {
            await dataAdapter.uncompleteTask(task.id);
          },
        });
        toast.success('已标记任务为完成');
        onRefresh?.();
      }
    }
  };

  const handleAddSubtaskConfirm = async (title: string) => {
    if (!subtaskParentTask) return;
    const parentTitle = subtaskParentTask.title;
    const res = await dataAdapter.createTask({
      title,
      parentId: subtaskParentTask.id,
      projectId: subtaskParentTask.projectId || projectId || null,
      status: 'TODO',
    });
    if (res.success && res.data?.id) {
      const createdId = res.data.id;
      pushAction({
        description: `添加子任务 "${title}"`,
        undo: async () => {
          await dataAdapter.deleteTask(createdId, true);
        },
      });
      toast.success(`已在 "${parentTitle}" 下创建子任务`);
      onRefresh?.();
    } else if (res.success) {
      toast.success(`已在 "${parentTitle}" 下创建子任务`);
      onRefresh?.();
    }
  };

  const handleDeleteTaskConfirm = async () => {
    if (!deleteTargetTask) return;
    const target = deleteTargetTask;
    const res = await dataAdapter.deleteTask(target.id);
    if (res.success) {
      pushAction({
        description: `删除节点 "${target.title}"`,
        undo: async () => {
          await dataAdapter.restoreTask(target.id);
        },
      });
      toast.success('已移入回收站');
      onRefresh?.();
    }
  };

  // Keep latest nodes in a ref so callbacks don't recreate on every drag/position change
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // 10. Canvas quick search callbacks
  const handleHighlightNodes = useCallback(
    (matchedIds: Set<string>, focusedId: string | null) => {
      setMatchedNodeIds((prev) => {
        if (prev.size === 0 && matchedIds.size === 0) return prev;
        if (prev.size === matchedIds.size) {
          let same = true;
          for (const id of matchedIds) {
            if (!prev.has(id)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return matchedIds;
      });
      setFocusedNodeId((prev) => (prev === focusedId ? prev : focusedId));
    },
    [],
  );

  const handleFocusNode = useCallback(
    (taskId: string) => {
      const targetNode = nodesRef.current.find((n) => n.id === taskId);
      if (targetNode) {
        setCenter(targetNode.position.x + 140, targetNode.position.y + 60, {
          duration: 350,
          zoom: 1.05,
        });
      }
    },
    [setCenter],
  );

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setMatchedNodeIds(EMPTY_ID_SET);
    setFocusedNodeId(null);
  }, []);

  // 11. Color coding action with undo
  const handleSetNodeColor = useCallback(
    (taskId: string, color: string | null) => {
      const prevColor = nodeColors[taskId] || null;
      setNodeColors((prev) => {
        const updated = { ...prev };
        if (!color) {
          delete updated[taskId];
        } else {
          updated[taskId] = color;
        }
        saveColors(updated);
        return updated;
      });

      const task = tasks.find((t) => t.id === taskId);
      const title = task?.title || '任务节点';

      pushAction({
        description: color ? `设置色彩标记 "${title}"` : `清除色彩标记 "${title}"`,
        undo: () => {
          setNodeColors((prev) => {
            const updated = { ...prev };
            if (prevColor) {
              updated[taskId] = prevColor;
            } else {
              delete updated[taskId];
            }
            saveColors(updated);
            return updated;
          });
        },
      });

      toast.success(color ? `已为 "${title}" 设置色彩标记` : `已清除色彩标记`);
    },
    [nodeColors, tasks, pushAction],
  );

  // 12. Spawning Dependent / Prerequisite Tasks
  const handleSpawnConfirm = async (title: string) => {
    if (!spawnConfig) return;
    const { task: parentTask, direction } = spawnConfig;
    const parentNode = nodes.find((n) => n.id === parentTask.id);
    const baseX = parentNode ? parentNode.position.x : 0;
    const baseY = parentNode ? parentNode.position.y : 0;

    let targetX = direction === 'NEXT' ? baseX + 340 : baseX - 340;
    let targetY = baseY;

    // Shift vertically if overlapping with existing nodes
    while (
      nodes.some(
        (n) =>
          Math.abs(n.position.x - targetX) < 40 &&
          Math.abs(n.position.y - targetY) < 40,
      )
    ) {
      targetY += 60;
    }

    // Create the new task
    const createRes = await dataAdapter.createTask({
      title,
      status: 'TODO',
      projectId: parentTask.projectId || projectId || null,
    });

    if (!createRes.success || !createRes.data?.id) {
      toast.error(createRes.error || '创建衍生任务失败');
      return;
    }

    const newTaskId = createRes.data.id;

    // Record position for the new node
    const posMap = getSavedPositions(projectId);
    posMap[newTaskId] = { x: Math.round(targetX), y: Math.round(targetY) };
    if (typeof window !== 'undefined') {
      try {
        const key = projectId ? `task_graph_user_node_positions_${projectId}` : POSITIONS_STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(posMap));
      } catch {}
    }

    // NEXT: newTaskId (dependent) DEPENDS_ON parentTask.id (prerequisite)
    // PREV: parentTask.id (dependent) DEPENDS_ON newTaskId (prerequisite)
    const dependentId = direction === 'NEXT' ? newTaskId : parentTask.id;
    const dependencyId = direction === 'NEXT' ? parentTask.id : newTaskId;

    await dataAdapter.addDependency(dependentId, dependencyId);

    // Register composite undo action
    pushAction({
      description:
        direction === 'NEXT'
          ? `衍生后续任务 "${title}"`
          : `衍生前置任务 "${title}"`,
      undo: async () => {
        await dataAdapter.deleteTask(newTaskId, true);
        onRefresh?.();
      },
    });

    toast.success(
      direction === 'NEXT'
        ? `已成功衍生后续任务: ${title}`
        : `已成功衍生前置任务: ${title}`,
    );
    setSpawnConfig(null);
    onRefresh?.();

    // Smooth camera focus to new node
    setTimeout(() => {
      setCenter(targetX + 140, targetY + 60, { duration: 400, zoom: 1.05 });
    }, 80);
  };

  return (
    <div className="relative h-full w-full bg-zinc-950">
      <ReactFlow
        nodes={decoratedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
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
            onUndo={handleUndo}
            canUndo={canUndo}
            lastActionDesc={lastActionDescription}
            onOpenSearch={() => setSearchOpen((prev) => !prev)}
            onOpenExport={() => setExportOpen(true)}
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

      {/* Floating Canvas Quick Search Bar (Ctrl+F) */}
      <GraphSearchBar
        open={searchOpen}
        onClose={handleCloseSearch}
        tasks={tasks}
        onHighlightNodes={handleHighlightNodes}
        onFocusNode={handleFocusNode}
      />

      {/* Right-click Drag Laser Cutter Overlay */}
      <GraphCuttingOverlay
        active={isCutting}
        points={cutPoints}
        severedCount={severedCount}
      />

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
        onUndo={handleUndo}
        canUndo={canUndo}
        lastActionDesc={lastActionDescription}
        onSpawnDependent={(task, direction) => setSpawnConfig({ task, direction })}
        onSetColor={handleSetNodeColor}
        currentColor={contextMenu.task ? nodeColors[contextMenu.task.id] || null : null}
      />

      {/* Modal Dialog for Spawning Dependent/Prerequisite Task */}
      <PromptDialog
        open={!!spawnConfig}
        onOpenChange={(open) => !open && setSpawnConfig(null)}
        title={
          spawnConfig?.direction === 'NEXT'
            ? '衍生后续依赖任务'
            : '衍生前置依赖任务'
        }
        description={
          spawnConfig?.direction === 'NEXT'
            ? `在 "${spawnConfig.task.title}" 之后创建新任务，并自动建立依赖连线`
            : `在 "${spawnConfig?.task.title}" 之前创建前置任务，并自动建立依赖连线`
        }
        placeholder={
          spawnConfig?.direction === 'NEXT'
            ? '输入后续依赖任务名称...'
            : '输入前置依赖任务名称...'
        }
        confirmText="立即衍生"
        onConfirm={handleSpawnConfirm}
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

      {/* Graph Export Dialog (Mermaid / JSON) */}
      <GraphExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        tasks={tasks}
        relations={relations}
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
