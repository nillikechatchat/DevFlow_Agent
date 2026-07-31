import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { ChangeSummary, TaskItem } from '@/lib/issuespec-api';
import { ChangeBoardSection } from './change-board-section';

vi.mock('@/hooks/use-issuespec-changes', () => ({
  useChanges: vi.fn(),
}));

vi.mock('@/hooks/use-issuespec-tasks', () => ({
  useTasks: vi.fn(),
}));

import { useChanges } from '@/hooks/use-issuespec-changes';
import { useTasks } from '@/hooks/use-issuespec-tasks';

const mockedUseChanges = vi.mocked(useChanges);
const mockedUseTasks = vi.mocked(useTasks);

const mockChanges: ChangeSummary[] = [
  {
    id: 'change-1',
    stage: 'implement',
    title: '实现 issuespec 追踪模块',
    repo: 'org/repo',
    status: 'in_progress',
    updatedAt: '2026-07-31T10:00:00.000Z',
  },
];

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    changeId: 'change-1',
    title: '实现 proxy helper',
    status: 'done',
    nodeId: 'p1',
    evidence: 'https://github.com/nillikechatchat/DevFlow_Agent/pull/1',
  },
  {
    id: 'task-2',
    changeId: 'change-1',
    title: '编写 API 路由测试',
    status: 'in_progress',
  },
  {
    id: 'task-3',
    changeId: 'change-1',
    title: '实现 hooks',
    status: 'open',
  },
];

function makeWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('ChangeBoardSection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the task list with progress and evidence links', () => {
    mockedUseChanges.mockReturnValue({
      data: mockChanges,
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChanges>);

    mockedUseTasks.mockReturnValue({
      data: mockTasks,
      isPending: false,
    } as unknown as ReturnType<typeof useTasks>);

    render(<ChangeBoardSection />, { wrapper: makeWrapper() });

    expect(screen.getByText('实现 proxy helper')).toBeDefined();
    expect(screen.getByText('编写 API 路由测试')).toBeDefined();
    expect(screen.getByText('1/3 已完成')).toBeDefined();
    expect(screen.getByText('节点 p1')).toBeDefined();
    const link = screen.getByText('证据').closest('a');
    expect(link?.getAttribute('href')).toBe(
      'https://github.com/nillikechatchat/DevFlow_Agent/pull/1',
    );
  });

  it('filters tasks by status', () => {
    mockedUseChanges.mockReturnValue({
      data: mockChanges,
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChanges>);

    mockedUseTasks.mockReturnValue({
      data: mockTasks,
      isPending: false,
    } as unknown as ReturnType<typeof useTasks>);

    render(<ChangeBoardSection />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole('combobox', { name: '状态筛选' }));
    const option = screen
      .getAllByRole('option')
      .find((node) => node.textContent === '已完成');
    fireEvent.click(option!);
    expect(screen.getByText('实现 proxy helper')).toBeDefined();
    expect(screen.queryByText('编写 API 路由测试')).toBeNull();
  });

  it('shows an empty state when no task matches the filter', () => {
    mockedUseChanges.mockReturnValue({
      data: mockChanges,
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChanges>);

    mockedUseTasks.mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof useTasks>);

    render(<ChangeBoardSection />, { wrapper: makeWrapper() });
    expect(screen.getByText('暂无匹配的任务单元')).toBeDefined();
  });
});
