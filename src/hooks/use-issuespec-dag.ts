import { useQuery } from '@tanstack/react-query';
import { issuespecApi } from '@/lib/issuespec-api';
import type { ProcessDag } from '@/lib/issuespec-api';

export function useDag(changeId: string | undefined) {
  return useQuery<ProcessDag>({
    queryKey: ['issuespec-dag', changeId],
    queryFn: () => issuespecApi.getDag(changeId as string),
    enabled: Boolean(changeId),
    retry: 1,
    placeholderData: (previousData) => previousData,
    throwOnError: false,
  });
}
