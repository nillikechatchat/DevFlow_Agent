import { useQuery } from '@tanstack/react-query';
import { issuespecApi } from '@/lib/issuespec-api';
import type { ChangeDetail } from '@/lib/issuespec-api';

export function useChangeDetail(id: string | undefined) {
  return useQuery<ChangeDetail>({
    queryKey: ['issuespec-change-detail', id],
    queryFn: () => issuespecApi.getChangeDetail(id as string),
    enabled: Boolean(id),
    retry: 1,
    placeholderData: (previousData) => previousData,
    throwOnError: false,
  });
}
