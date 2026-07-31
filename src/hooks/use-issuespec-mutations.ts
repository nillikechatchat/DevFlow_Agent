import { useMutation, useQueryClient } from '@tanstack/react-query';
import { issuespecApi } from '@/lib/issuespec-api';
import type { ApprovalDecision, VerifyResult } from '@/lib/issuespec-api';
import { toast } from 'sonner';
import { useNotificationStore } from '@/lib/notification-store';
import { formatErrorMessage } from '@/lib/api-error';
import { auditMutation } from '@/lib/audit-store';

function useNotify() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  return addNotification;
}

function invalidateChangeData(queryClient: ReturnType<typeof useQueryClient>, changeId: string) {
  queryClient.invalidateQueries({ queryKey: ['issuespec-changes'] });
  queryClient.invalidateQueries({ queryKey: ['issuespec-change-detail', changeId] });
  queryClient.invalidateQueries({ queryKey: ['issuespec-verify', changeId] });
  queryClient.invalidateQueries({ queryKey: ['issuespec-tasks', changeId] });
  queryClient.invalidateQueries({ queryKey: ['issuespec-approvals', changeId] });
}

export function useTriggerVerify() {
  const queryClient = useQueryClient();
  const addNotification = useNotify();

  return useMutation<VerifyResult, unknown, { changeId: string }>({
    mutationFn: ({ changeId }) => issuespecApi.triggerVerify({ changeId }),
    onSuccess: (result, { changeId }) => {
      queryClient.invalidateQueries({ queryKey: ['issuespec-verify', changeId] });
      const ok = result.status === 'PASS';
      toast.success(`verify 完成: ${result.status}`);
      addNotification({
        type: ok ? 'success' : 'error',
        title: `verify ${result.status}`,
        message: `变更 ${changeId} 门禁结果: ${result.reasons.join('；') || '无附加说明'}`,
      });
      auditMutation('verify', changeId, 'trigger', result.status);
    },
    onError: (err, { changeId }) => {
      toast.error(`verify 触发失败: ${formatErrorMessage(err)}`);
      addNotification({ type: 'error', title: 'verify 触发失败', message: formatErrorMessage(err) });
      auditMutation('verify', changeId, 'trigger-failed', formatErrorMessage(err), 'error');
    },
  });
}

export function useSubmitApproval() {
  const queryClient = useQueryClient();
  const addNotification = useNotify();

  return useMutation<
    unknown,
    unknown,
    { changeId: string; decision: ApprovalDecision; reason?: string }
  >({
    mutationFn: ({ changeId, decision, reason }) =>
      issuespecApi.submitApproval(changeId, { decision, reason }),
    onSuccess: (_, { changeId, decision }) => {
      invalidateChangeData(queryClient, changeId);
      const label = decision === 'approved' ? '批准' : '拒绝';
      toast.success(`审批动作已${label}`);
      addNotification({ type: 'success', title: `审批${label}`, message: `变更 ${changeId} 的审批请求已${label}` });
      auditMutation('approval', changeId, decision);
    },
    onError: (err, { changeId, decision }) => {
      toast.error(`审批提交失败: ${formatErrorMessage(err)}`);
      addNotification({ type: 'error', title: '审批提交失败', message: formatErrorMessage(err) });
      auditMutation('approval', changeId, `${decision}-failed`, formatErrorMessage(err), 'error');
    },
  });
}
