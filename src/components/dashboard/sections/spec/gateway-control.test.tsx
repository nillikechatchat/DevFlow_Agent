import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { VerifyResult } from '@/lib/issuespec-api';
import { VerifyPanel } from './verify-panel';
import { ApprovalCard } from './approval-card';

vi.mock('@/hooks/use-issuespec-mutations', () => ({
  useSubmitApproval: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/notification-store', () => ({
  useNotificationStore: () => vi.fn(),
}));
vi.mock('@/lib/audit-store', () => ({ auditMutation: vi.fn() }));

import { useSubmitApproval } from '@/hooks/use-issuespec-mutations';

const mockedUseSubmitApproval = vi.mocked(useSubmitApproval);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const failingVerify: VerifyResult = {
  change: 'change-1',
  status: 'FAIL',
  blocking_questions: 2,
  traceability: 'broken',
  p0_p1_open: 1,
  pr_checks: 'failed',
  reasons: ['阻塞 QUESTION 未解', 'PR 检查未过'],
};

const passingVerify: VerifyResult = {
  change: 'change-1',
  status: 'PASS',
  blocking_questions: 0,
  traceability: 'ok',
  p0_p1_open: 0,
  pr_checks: 'passed',
  reasons: [],
};

describe('VerifyPanel gate', () => {
  afterEach(cleanup);

  it('shows FAIL details and disables the archive entry', () => {
    render(<VerifyPanel verify={failingVerify} onArchive={vi.fn()} />);
    expect(screen.getByText('FAIL')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('断裂')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('未过')).toBeDefined();
    expect(screen.getByText('阻塞 QUESTION 未解')).toBeDefined();
    const archive = screen.getByText(/门禁未通过/);
    expect((archive.closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the archive entry enabled when PASS', () => {
    const onArchive = vi.fn();
    render(<VerifyPanel verify={passingVerify} onArchive={onArchive} />);
    const archive = screen.getByText('归档变更');
    fireEvent.click(archive);
    expect(onArchive).toHaveBeenCalledTimes(1);
  });
});

describe('ApprovalCard', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the L3 action and submits approve/reject through the mutation', () => {
    const mutate = vi.fn();
    mockedUseSubmitApproval.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSubmitApproval>);

    render(
      <ApprovalCard
        changeId="change-1"
        action="merge"
        requestedAt="2026-07-31T08:00:00.000Z"
      />,
    );

    expect(screen.getByText('merge')).toBeDefined();
    expect(screen.getByText('L3')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '批准' }));
    expect(mutate).toHaveBeenCalledWith({
      changeId: 'change-1',
      decision: 'approved',
    });

    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    expect(mutate).toHaveBeenCalledWith({
      changeId: 'change-1',
      decision: 'rejected',
    });
  });
});
