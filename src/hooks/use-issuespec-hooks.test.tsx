import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/issuespec-api', () => ({
  issuespecApi: {
    listChanges: vi.fn(),
    getChangeDetail: vi.fn(),
    getDag: vi.fn(),
    getTasks: vi.fn(),
    getVerify: vi.fn(),
    getApprovals: vi.fn(),
    submitApproval: vi.fn(),
    triggerVerify: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/notification-store', () => ({
  useNotificationStore: () => vi.fn(),
}));
vi.mock('@/lib/audit-store', () => ({ auditMutation: vi.fn() }));

import { issuespecApi } from '@/lib/issuespec-api';
import type { ChangeSummary, VerifyResult } from '@/lib/issuespec-api';
import { useChanges } from './use-issuespec-changes';
import { useChangeDetail } from './use-issuespec-change-detail';
import { useVerify } from './use-issuespec-verify';
import { useSubmitApproval } from './use-issuespec-mutations';

const mockedApi = vi.mocked(issuespecApi);

const mockChange: ChangeSummary = {
  id: 'change-1',
  stage: 'implement',
  title: '示例变更',
  repo: 'nillikechatchat/DevFlow_Agent',
  status: 'in_progress',
  updatedAt: '2026-07-31T10:00:00.000Z',
};

const mockVerify: VerifyResult = {
  change: 'change-1',
  status: 'PASS',
  blocking_questions: 0,
  traceability: 'ok',
  p0_p1_open: 0,
  pr_checks: 'passed',
  reasons: [],
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('issue-spec hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the change list', async () => {
    mockedApi.listChanges.mockResolvedValue([mockChange]);
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useChanges(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockChange]);
  });

  it('degrades gracefully when the change list fails', async () => {
    mockedApi.listChanges.mockRejectedValue(new Error('network down'));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useChanges(), {
      wrapper: makeWrapper(queryClient),
    });
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
    expect(result.current.data).toBeUndefined();
  });

  it('skips the detail query while no id is selected', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useChangeDetail(undefined), {
      wrapper: makeWrapper(queryClient),
    });
    expect(result.current.isPending).toBe(true);
    expect(mockedApi.getChangeDetail).not.toHaveBeenCalled();
  });

  it('revalidates the verify cache after an approval mutation', async () => {
    const queryClient = createQueryClient();
    const verifyFn = vi.fn().mockResolvedValue(mockVerify);
    mockedApi.getVerify.mockImplementation(verifyFn);
    mockedApi.submitApproval.mockResolvedValue({
      id: 'approval-1',
      changeId: 'change-1',
      action: 'merge',
      requestedAt: '2026-07-31T08:00:00.000Z',
    });

    const { result: verifyResult } = renderHook(() => useVerify('change-1'), {
      wrapper: makeWrapper(queryClient),
    });
    void verifyResult;
    await waitFor(() => expect(verifyFn).toHaveBeenCalledWith('change-1'));

    const { result: mutation } = renderHook(() => useSubmitApproval(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await mutation.current.mutateAsync({
        changeId: 'change-1',
        decision: 'approved',
      });
    });

    await waitFor(() => expect(verifyFn).toHaveBeenCalledTimes(2));
    expect(mockedApi.submitApproval).toHaveBeenCalledWith('change-1', {
      decision: 'approved',
      reason: undefined,
    });
  });
});
