import { useQuery } from '@tanstack/react-query';
import { issuespecApi } from '@/lib/issuespec-api';
import type { TaskItem } from '@/lib/issuespec-api';

export function useTasks(changeId: string | undefined) {
  return useQuery<TaskItem[]>({
    queryKey: ['issuespec-tasks', changeId],
    queryFn: () => issuespecApi.getTasks(changeId as string),
    enabled: Boolean(changeId),
    retry: 1,
    placeholderData: (previousData) => previousData,
    throwOnError: false,
  });
}
