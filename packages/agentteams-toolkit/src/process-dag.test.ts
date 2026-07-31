import { describe, it, expect } from 'vitest';
import {
  buildProcessGraph,
  topologicalSort,
  isParallelizable,
  assignParallelism,
  type ProcessNode,
} from './process-dag.js';

function node(overrides: Partial<ProcessNode> & { id: string }): ProcessNode {
  return {
    name: overrides.id,
    owner: 'developer-worker',
    dependencies: [],
    parallelWith: [],
    status: 'PENDING',
    ...overrides,
  };
}

describe('buildProcessGraph', () => {
  it('builds a graph with unique ids and valid dependencies', () => {
    const graph = buildProcessGraph([
      node({ id: 'A' }),
      node({ id: 'B', dependencies: ['A'] }),
    ]);
    expect(graph.nodes).toHaveLength(2);
  });

  it('rejects duplicate node ids', () => {
    expect(() =>
      buildProcessGraph([node({ id: 'A' }), node({ id: 'A' })]),
    ).toThrow('DAG 构建失败');
  });

  it('rejects a dependency that does not exist', () => {
    expect(() =>
      buildProcessGraph([node({ id: 'A', dependencies: ['ghost'] })]),
    ).toThrow('DAG 构建失败');
  });

  it('rejects a node depending on itself', () => {
    expect(() =>
      buildProcessGraph([node({ id: 'A', dependencies: ['A'] })]),
    ).toThrow('DAG 构建失败');
  });
});

describe('topologicalSort', () => {
  it('orders independent nodes in a stable order', () => {
    const graph = buildProcessGraph([node({ id: 'A' }), node({ id: 'B' })]);
    expect(topologicalSort(graph)).toEqual(['A', 'B']);
  });

  it('orders a dependency chain before dependents', () => {
    const graph = buildProcessGraph([
      node({ id: 'D', dependencies: ['B', 'C'] }),
      node({ id: 'C', dependencies: ['A'] }),
      node({ id: 'B', dependencies: ['A'] }),
      node({ id: 'A' }),
    ]);
    const order = topologicalSort(graph);
    expect(order).toHaveLength(4);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
    expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
  });

  it('throws when the graph contains a cycle', () => {
    const graph = buildProcessGraph([
      node({ id: 'A', dependencies: ['B'] }),
      node({ id: 'B', dependencies: ['A'] }),
    ]);
    expect(() => topologicalSort(graph)).toThrow('循环依赖');
  });
});

describe('isParallelizable', () => {
  const a = node({ id: 'A' });
  const b = node({ id: 'B' });

  it('allows parallel execution when write domains do not overlap', () => {
    expect(
      isParallelizable(a, b, { A: ['backend'], B: ['frontend'] }),
    ).toBe(true);
  });

  it('blocks parallel execution when write domains overlap', () => {
    expect(
      isParallelizable(a, b, { A: ['backend'], B: ['backend'] }),
    ).toBe(false);
  });

  it('blocks parallel execution when one node depends on the other', () => {
    const dependent = node({ id: 'B', dependencies: ['A'] });
    expect(isParallelizable(a, dependent, { A: ['x'], B: ['y'] })).toBe(false);
  });
});

describe('assignParallelism', () => {
  it('marks only disjoint-write nodes as parallel', () => {
    const graph = buildProcessGraph([
      node({ id: 'A' }),
      node({ id: 'B' }),
      node({ id: 'C' }),
    ]);
    const assigned = assignParallelism(graph, {
      A: ['backend'],
      B: ['frontend'],
      C: ['backend'],
    });
    const byId = new Map(assigned.nodes.map((n) => [n.id, n]));
    expect(byId.get('A')?.parallelWith).toEqual(['B']);
    expect(byId.get('B')?.parallelWith.sort()).toEqual(['A', 'C']);
    expect(byId.get('C')?.parallelWith).toEqual(['B']);
  });

  it('does not mutate the input graph', () => {
    const graph = buildProcessGraph([node({ id: 'A' }), node({ id: 'B' })]);
    assignParallelism(graph, { A: ['x'], B: ['y'] });
    expect(graph.nodes[0].parallelWith).toEqual([]);
  });
});
