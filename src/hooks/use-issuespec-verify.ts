import { useQuery } from '@tanstack/react-query';
import { issuespecApi } from '@/lib/issuespec-api';
import type { VerifyResult } from '@/lib/issuespec-api';

export function useVerify(changeId: string | undefined) {
  return useQuery<VerifyResult>({
    queryKey: ['issuespec-verify', changeId],
    queryFn: () => issuespecApi.getVerify(changeId as string),
    enabled: Boolean(changeId),
    retry: 1,
    placeholderData: (previousData) => previousData,
    throwOnError: false,
  });
}
