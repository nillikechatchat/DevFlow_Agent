'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, CircleAlert, CircleCheck, CirclePlay, ExternalLink, Loader2, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ProcessNode, ProcessNodeStatus } from '@/lib/issuespec-api';

const NODE_WIDTH = 176;
const NODE_HEIGHT = 64;
const COLUMN_GAP = 16;
const LAYER_GAP = 32;

const STATUS_STYLES: Record<ProcessNodeStatus, { ring: string; label: string }> = {
  PENDING: { ring: 'border-slate-300 dark:border-slate-700', label: '待执行' },
  RUNNING: { ring: 'border-amber-400', label: '执行中' },
  COMPLETED: { ring: 'border-emerald-400', label: '已完成' },
  FAILED: { ring: 'border-rose-400', label: '失败' },
};

const STATUS_ICONS: Record<ProcessNodeStatus, React.ReactNode> = {
  PENDING: <Pause className="w-3.5 h-3.5" aria-hidden="true" />,
  RUNNING: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
  COMPLETED: <CircleCheck className="w-3.5 h-3.5" aria-hidden="true" />,
  FAILED: <CircleAlert className="w-3.5 h-3.5" aria-hidden="true" />,
};

interface PlacedNode {
  node: ProcessNode;
  x: number;
  y: number;
  layer: number;
}

interface DagLayout {
  placed: PlacedNode[];
  width: number;
  height: number;
  cyclicIds: Set<string>;
}

function computeLayout(nodes: ProcessNode[]): DagLayout {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = new Map<string, number>();

  const visit = (id: string, stack: Set<string>): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    if (!node) return 0;
    let maxDep = 0;
    for (const dep of node.dependencies) {
      if (stack.has(dep)) continue;
      maxDep = Math.max(maxDep, visit(dep, new Set(stack).add(id)));
    }
    const result = maxDep + 1;
    depth.set(id, result);
    return result;
  };

  for (const node of nodes) {
    visit(node.id, new Set());
  }

  const layers = new Map<number, ProcessNode[]>();
  for (const node of nodes) {
    const level = depth.get(node.id) ?? 1;
    layers.set(level, [...(layers.get(level) ?? []), node]);
  }

  const maxLayer = Math.max(0, ...layers.keys());
  const placed: PlacedNode[] = [];
  for (const [level, layerNodes] of layers) {
    layerNodes.forEach((node, index) => {
      placed.push({
        node,
        layer: level,
        x: index * (NODE_WIDTH + COLUMN_GAP),
        y: (level - 1) * (NODE_HEIGHT + LAYER_GAP),
      });
    });
  }

  const maxColumns = Math.max(0, ...[...layers.values()].map((layer) => layer.length));
  const width = maxColumns * NODE_WIDTH + Math.max(0, maxColumns - 1) * COLUMN_GAP;
  const height = maxLayer * NODE_HEIGHT + Math.max(0, maxLayer - 1) * LAYER_GAP;

  return {
    placed,
    width,
    height,
    cyclicIds: new Set<string>(),
  };
}

function detectCycle(nodes: ProcessNode[]): string[] {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const colors = new Map<string, number>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const inCycle = new Set<string>();

  const visit = (id: string): boolean => {
    colors.set(id, GRAY);
    for (const dep of byId.get(id)?.dependencies ?? []) {
      const color = colors.get(dep);
      if (color === GRAY) {
        inCycle.add(dep);
        return true;
      }
      if (color !== BLACK && byId.has(dep)) {
        if (visit(dep)) {
          inCycle.add(id);
          return true;
        }
      }
    }
    colors.set(id, BLACK);
    return false;
  };

  for (const node of nodes) {
    if (colors.get(node.id) === undefined) {
      visit(node.id);
    }
  }
  return [...inCycle];
}

interface ProcessDagPanelProps {
  dag: { nodes: ProcessNode[] };
}

export function ProcessDagPanel({ dag }: ProcessDagPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const base = computeLayout(dag.nodes);
    return { ...base, cyclicIds: new Set(detectCycle(dag.nodes)) };
  }, [dag.nodes]);

  const byId = useMemo(() => new Map(dag.nodes.map((node) => [node.id, node])), [dag.nodes]);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  if (layout.placed.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">
        暂无 PROCESS 节点
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowDown className="w-4 h-4" aria-hidden="true" />
        依赖自上而下流动，虚线边框表示与同层节点可并行
      </div>
      <div className="relative overflow-x-auto p-4">
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <marker id="dag-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" className="fill-slate-400" />
            </marker>
          </defs>
          {layout.placed.map(({ node, x, y }) =>
            node.dependencies.map((dep) => {
              const depPlaced = layout.placed.find((p) => p.node.id === dep);
              if (!depPlaced) return null;
              return (
                <line
                  key={`${node.id}-${dep}`}
                  x1={depPlaced.x + NODE_WIDTH / 2}
                  y1={depPlaced.y + NODE_HEIGHT}
                  x2={x + NODE_WIDTH / 2}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-400"
                  strokeWidth="1.5"
                  markerEnd="url(#dag-arrow)"
                />
              );
            }),
          )}
        </svg>

        <div className="relative" style={{ width: layout.width, height: layout.height }}>
          {layout.placed.map(({ node, x, y }) => {
            const isSelected = node.id === selectedId;
            const isParallel = node.parallelWith.length > 0;
            const isCyclic = layout.cyclicIds.has(node.id);
            const status = STATUS_STYLES[node.status];
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : node.id)}
                className={`absolute flex flex-col justify-center rounded-lg border p-2 text-left transition-colors ${
                  isParallel
                    ? 'border-dashed border-blue-400/70 hover:border-blue-500'
                    : 'border-solid border-border'
                } ${status.ring} ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'} ${
                  isCyclic ? 'bg-rose-500/5' : 'bg-card'
                }`}
                style={{ left: x, top: y, width: NODE_WIDTH, height: NODE_HEIGHT }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {STATUS_ICONS[node.status]}
                  <span className="text-sm font-medium truncate">{node.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {status.label}
                  </Badge>
                  {isParallel && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400/40 text-blue-600 dark:text-blue-400">
                      可并行
                    </Badge>
                  )}
                  {isCyclic && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-rose-400/40 text-rose-600 dark:text-rose-400">
                      循环引用
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <Card className="glass-card">
          <CardContent className="p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <CirclePlay className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{selected.name}</span>
              <span className="text-xs text-muted-foreground">({selected.id})</span>
            </div>
            <p className="text-muted-foreground">拥有 Agent: {selected.owner}</p>
            {selected.dependencies.length > 0 && (
              <p className="text-muted-foreground">
                依赖: {selected.dependencies.join(', ')}
              </p>
            )}
            {selected.parallelWith.length > 0 && (
              <p className="text-muted-foreground">
                可并行: {selected.parallelWith.join(', ')}
              </p>
            )}
            {selected.evidence ? (
              <a
                href={selected.evidence}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                执行日志与产出证据
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">暂无执行日志入口</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
