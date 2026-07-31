import { useQuery } from '@tanstack/react-query';
import { issuespecApi } from '@/lib/issuespec-api';
import type { ChangeSummary } from '@/lib/issuespec-api';

export function useChanges() {
  return useQuery<ChangeSummary[]>({
    queryKey: ['issuespec-changes'],
    queryFn: () => issuespecApi.listChanges(),
    refetchInterval: 10000,
    retry: 1,
    placeholderData: (previousData) => previousData,
    throwOnError: false,
  });
}
