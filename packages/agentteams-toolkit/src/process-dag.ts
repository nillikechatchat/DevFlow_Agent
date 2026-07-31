export type ProcessStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ProcessNode {
  id: string;
  name: string;
  owner: string;
  dependencies: string[];
  parallelWith: string[];
  status: ProcessStatus;
  evidence?: string;
}

export interface ProcessGraph {
  nodes: ProcessNode[];
}

export interface ProcessDagError {
  code: 'duplicate-id' | 'missing-dependency' | 'self-dependency' | 'cycle';
  message: string;
  nodeIds: string[];
}

export function buildProcessGraph(nodes: ProcessNode[]): ProcessGraph {
  const errors: ProcessDagError[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) {
      errors.push({
        code: 'duplicate-id',
        message: `PROCESS 节点 id 重复: ${node.id}`,
        nodeIds: [node.id],
      });
    }
    seen.add(node.id);
  }
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    if (node.dependencies.includes(node.id)) {
      errors.push({
        code: 'self-dependency',
        message: `PROCESS 节点 ${node.id} 不能依赖自身`,
        nodeIds: [node.id],
      });
    }
    for (const dep of node.dependencies) {
      if (!ids.has(dep)) {
        errors.push({
          code: 'missing-dependency',
          message: `PROCESS 节点 ${node.id} 引用了不存在的依赖 ${dep}`,
          nodeIds: [node.id, dep],
        });
      }
    }
  }
  if (errors.length > 0) {
    const detail = errors.map((error) => error.message).join('; ');
    throw new Error(`DAG 构建失败: ${detail}`);
  }
  return { nodes };
}

export function topologicalSort(graph: ProcessGraph): string[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const node of graph.nodes) {
    for (const dep of node.dependencies) {
      adjacency.get(dep)?.push(node.id);
      indegree.set(node.id, (indegree.get(node.id) ?? 0) + 1);
    }
  }
  const queue = graph.nodes
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) {
        queue.push(next);
      }
    }
  }
  if (order.length !== graph.nodes.length) {
    throw new Error('PROCESS DAG 存在循环依赖');
  }
  return order;
}

export function writeDomainOverlap(
  firstDomains: string[],
  secondDomains: string[],
): boolean {
  return firstDomains.some((domain) => secondDomains.includes(domain));
}

export function isParallelizable(
  first: ProcessNode,
  second: ProcessNode,
  writeDomains: Record<string, string[]>,
): boolean {
  if (
    first.dependencies.includes(second.id) ||
    second.dependencies.includes(first.id)
  ) {
    return false;
  }
  const firstDomains = writeDomains[first.id] ?? [];
  const secondDomains = writeDomains[second.id] ?? [];
  return !writeDomainOverlap(firstDomains, secondDomains);
}

export function assignParallelism(
  graph: ProcessGraph,
  writeDomains: Record<string, string[]>,
): ProcessGraph {
  const nodes = graph.nodes.map(
    (node) => ({ ...node, parallelWith: [] as string[] }),
  );
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const first = nodes[i];
      const second = nodes[j];
      if (isParallelizable(first, second, writeDomains)) {
        first.parallelWith.push(second.id);
        second.parallelWith.push(first.id);
      }
    }
  }
  return { nodes };
}
