import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChangeSummary, TypedComment } from '@/lib/issuespec-api';
import { TypedCommentTimeline } from './spec/typed-comment-timeline';
import { SpecWorkflowSection } from './spec-workflow-section';

vi.mock('@/hooks/use-issuespec-changes', () => ({
  useChanges: vi.fn(),
}));

vi.mock('@/hooks/use-issuespec-change-detail', () => ({
  useChangeDetail: vi.fn(),
}));

import { useChanges } from '@/hooks/use-issuespec-changes';
import { useChangeDetail } from '@/hooks/use-issuespec-change-detail';

const mockedUseChanges = vi.mocked(useChanges);
const mockedUseChangeDetail = vi.mocked(useChangeDetail);

const allComments: TypedComment[] = (
  [
    ['SPEC', 'proposal-worker', '变更规格说明'],
    ['QUESTION', 'architect', '此方案是否满足写域隔离？'],
    ['ANSWER', 'developer-worker', '已确认满足。'],
    ['TASK', 'implement', '实现 proxy helper'],
    ['PROCESS', 'implement', '节点 p1 完成'],
    ['REVIEW', 'reviewer-worker', 'P0 finding 已闭合'],
    ['VERIFY', 'verify-worker', 'verify 通过'],
  ] as const
).map(([type, author, content], index) => ({
  id: `comment-${index}`,
  type,
  author,
  createdAt: `2026-07-31T0${index}:00:00.000Z`,
  content,
  changeId: 'change-1',
}));

const mockChanges: ChangeSummary[] = [
  {
    id: 'p1',
    stage: 'proposal',
    title: 'Proposal A',
    repo: 'org/repo',
    status: 'open',
    updatedAt: '2026-07-31T10:00:00.000Z',
  },
  {
    id: 'd1',
    stage: 'design',
    title: 'Design B',
    repo: 'org/repo',
    status: 'in_progress',
    updatedAt: '2026-07-31T09:00:00.000Z',
  },
  {
    id: 'i1',
    stage: 'implement',
    title: 'Implement C',
    repo: 'org/repo',
    status: 'blocked',
    updatedAt: '2026-07-31T08:00:00.000Z',
  },
];

describe('TypedCommentTimeline', () => {
  afterEach(cleanup);

  it('renders every typed comment kind with author, time and content', () => {
    render(<TypedCommentTimeline comments={allComments} />);
    for (const kind of ['SPEC', 'QUESTION', 'ANSWER', 'TASK', 'PROCESS', 'REVIEW', 'VERIFY'] as const) {
      expect(screen.getByText(kind)).toBeDefined();
    }
    expect(screen.getByText('proposal-worker')).toBeDefined();
    expect(screen.getByText('变更规格说明')).toBeDefined();
    expect(screen.getByText('verify 通过')).toBeDefined();
  });

  it('sorts comments chronologically', () => {
    render(<TypedCommentTimeline comments={[...allComments].reverse()} />);
    const contents = screen.getAllByText(
      /(变更规格说明|此方案是否满足写域隔离|已确认满足|实现 proxy helper|节点 p1 完成|P0 finding 已闭合|verify 通过)/,
    );
    expect(contents).toHaveLength(allComments.length);
  });

  it('shows an empty state when no comments exist', () => {
    render(<TypedCommentTimeline comments={[]} />);
    expect(screen.getByText('暂无结构化评论')).toBeDefined();
  });
});

describe('SpecWorkflowSection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('switches between the three stages and shows the matching changes', () => {
    mockedUseChanges.mockReturnValue({
      data: mockChanges,
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChanges>);

    mockedUseChangeDetail.mockReturnValue({
      data: { ...mockChanges[0], comments: [] },
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useChangeDetail>);

    render(<SpecWorkflowSection />);

    expect(screen.getByText('Proposal A')).toBeDefined();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Design/ }));
    expect(screen.getByText('Design B')).toBeDefined();
    expect(screen.queryByText('Proposal A')).toBeNull();

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Implement/ }));
    expect(screen.getByText('Implement C')).toBeDefined();
    expect(screen.queryByText('Design B')).toBeNull();
  });

  it('renders the selected change timeline', () => {
    mockedUseChanges.mockReturnValue({
      data: mockChanges,
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useChanges>);

    mockedUseChangeDetail.mockReturnValue({
      data: { ...mockChanges[0], comments: allComments.slice(0, 2) },
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useChangeDetail>);

    render(<SpecWorkflowSection />);
    fireEvent.click(screen.getByText('Proposal A'));
    expect(screen.getByText('变更规格说明')).toBeDefined();
  });
});
