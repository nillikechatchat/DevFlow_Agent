import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildProcessGraph,
  topologicalSort,
  assignParallelism,
  type ProcessNode,
} from './process-dag';

const writeDomainPool = ['backend', 'frontend', 'infra', 'data'];

const arbitraryAcyclicGraph = fc
  .array(fc.record({ dependencies: fc.array(fc.integer({ min: 0, max: 7 })) }), {
    minLength: 0,
    maxLength: 8,
  })
  .map((entries) =>
    entries.map((entry, index) => {
      const validDependencies = entry.dependencies
        .filter((target) => target < index)
        .map((target) => `n${target}`);
      return {
        id: `n${index}`,
        name: `node-${index}`,
        owner: 'developer-worker',
        dependencies: [...new Set(validDependencies)],
        parallelWith: [],
        status: 'PENDING',
      } satisfies ProcessNode;
    }),
  );

const arbitraryGraphWithDomains = fc
  .record({
    entries: fc.array(
      fc.record({
        dependencies: fc.array(fc.integer({ min: 0, max: 7 })),
        domains: fc.array(fc.constantFrom(...writeDomainPool), { maxLength: 3 }),
      }),
      { minLength: 0, maxLength: 8 },
    ),
  })
  .map(({ entries }) => {
    const nodes = entries.map((entry, index) => {
      const validDependencies = entry.dependencies
        .filter((target) => target < index)
        .map((target) => `n${target}`);
      return {
        id: `n${index}`,
        name: `node-${index}`,
        owner: 'developer-worker',
        dependencies: [...new Set(validDependencies)],
        parallelWith: [],
        status: 'PENDING',
      } satisfies ProcessNode;
    });
    const writeDomains: Record<string, string[]> = {};
    entries.forEach((entry, index) => {
      writeDomains[`n${index}`] = [...new Set(entry.domains)];
    });
    return { nodes, writeDomains };
  });

describe('PROCESS DAG properties', () => {
  it('C3: any generated DAG sorts to a total order that respects every edge', () => {
    fc.assert(
      fc.property(arbitraryAcyclicGraph, (nodes) => {
        const order = topologicalSort(buildProcessGraph(nodes));
        const position = new Map(order.map((id, index) => [id, index]));
        expect(order).toHaveLength(nodes.length);
        for (const node of nodes) {
          for (const dep of node.dependencies) {
            expect(position.get(dep)).toBeLessThan(position.get(node.id));
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('C3: topologicalSort reports a cycle for every cyclic dependency graph', () => {
    fc.assert(
      fc.property(arbitraryAcyclicGraph, (nodes) => {
        fc.pre(nodes.length >= 2);
        const cyclicNodes = nodes.map((node, index) => ({
          ...node,
          dependencies: [nodes[(index + 1) % nodes.length].id],
        }));
        expect(() => topologicalSort(buildProcessGraph(cyclicNodes))).toThrow(
          '循环依赖',
        );
      }),
      { numRuns: 100 },
    );
  });

  it('C4: every parallel pair has disjoint write domains and no direct dependency', () => {
    fc.assert(
      fc.property(arbitraryGraphWithDomains, ({ nodes, writeDomains }) => {
        const assigned = assignParallelism(buildProcessGraph(nodes), writeDomains);
        const byId = new Map(assigned.nodes.map((node) => [node.id, node]));
        for (const node of assigned.nodes) {
          for (const peerId of node.parallelWith) {
            const peer = byId.get(peerId);
            expect(peer).toBeDefined();
            const nodeDomains = new Set(writeDomains[node.id] ?? []);
            const peerDomains = new Set(writeDomains[peerId] ?? []);
            const overlap = [...nodeDomains].some((domain) =>
              peerDomains.has(domain),
            );
            expect(overlap).toBe(false);
            expect(node.dependencies).not.toContain(peerId);
            expect(peer?.dependencies).not.toContain(node.id);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('C4: nodes with overlapping write domains or a direct dependency are never parallel', () => {
    fc.assert(
      fc.property(arbitraryGraphWithDomains, ({ nodes, writeDomains }) => {
        const assigned = assignParallelism(buildProcessGraph(nodes), writeDomains);
        const byId = new Map(assigned.nodes.map((node) => [node.id, node]));
        for (const first of assigned.nodes) {
          for (const second of assigned.nodes) {
            if (first.id === second.id) continue;
            const overlap = (writeDomains[first.id] ?? []).some((domain) =>
              (writeDomains[second.id] ?? []).includes(domain),
            );
            const hasEdge =
              first.dependencies.includes(second.id) ||
              second.dependencies.includes(first.id);
            if (overlap || hasEdge) {
              expect(first.parallelWith).not.toContain(second.id);
              expect(second.parallelWith).not.toContain(first.id);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
