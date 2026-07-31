import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProcessNode } from '@/lib/issuespec-api';
import { ProcessDagPanel } from './process-dag-panel';

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

describe('ProcessDagPanel', () => {
  afterEach(cleanup);

  it('shows an empty state for an empty graph', () => {
    render(<ProcessDagPanel dag={{ nodes: [] }} />);
    expect(screen.getByText('暂无 PROCESS 节点')).toBeDefined();
  });

  it('renders a single node with its status', () => {
    render(
      <ProcessDagPanel
        dag={{ nodes: [node({ id: 'p1', name: '代理层', status: 'COMPLETED' })] }}
      />,
    );
    expect(screen.getByText('代理层')).toBeDefined();
    expect(screen.getByText('已完成')).toBeDefined();
  });

  it('renders a parallel graph and marks disjoint nodes as parallel', () => {
    const nodes = [
      node({ id: 'p1', name: '后端', parallelWith: ['p2'] }),
      node({ id: 'p2', name: '前端', parallelWith: ['p1'] }),
    ];
    render(<ProcessDagPanel dag={{ nodes }} />);
    expect(screen.getByText('后端')).toBeDefined();
    expect(screen.getByText('前端')).toBeDefined();
    expect(screen.getAllByText('可并行')).toHaveLength(2);
  });

  it('renders a cyclic graph without crashing and flags cycle nodes', () => {
    const nodes = [
      node({ id: 'a', name: 'A', dependencies: ['b'] }),
      node({ id: 'b', name: 'B', dependencies: ['a'] }),
    ];
    render(<ProcessDagPanel dag={{ nodes }} />);
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getAllByText('循环引用').length).toBeGreaterThan(0);
  });

  it('shows the owning agent and evidence link when a node is selected', () => {
    const nodes = [
      node({
        id: 'p1',
        name: '代理层',
        owner: 'qa-worker',
        evidence: 'https://github.com/nillikechatchat/DevFlow_Agent/pull/1',
      }),
    ];
    render(<ProcessDagPanel dag={{ nodes }} />);
    fireEvent.click(screen.getByText('代理层'));
    expect(screen.getByText('拥有 Agent: qa-worker')).toBeDefined();
    expect(
      screen.getByText('执行日志与产出证据').getAttribute('href'),
    ).toBe('https://github.com/nillikechatchat/DevFlow_Agent/pull/1');
  });
});
