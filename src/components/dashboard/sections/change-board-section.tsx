'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GitBranch, ListChecks } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionHeader } from '@/components/dashboard/section-header';
import { useChanges } from '@/hooks/use-issuespec-changes';
import { useTasks } from '@/hooks/use-issuespec-tasks';
import type { TaskItem, TaskStatus } from '@/lib/issuespec-api';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: '打开',
  in_progress: '进行中',
  done: '已完成',
  failed: '失败',
};

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  open: 'border-slate-400/40 text-slate-600 dark:text-slate-400',
  in_progress: 'border-amber-400/40 text-amber-600 dark:text-amber-400',
  done: 'border-emerald-400/40 text-emerald-600 dark:text-emerald-400',
  failed: 'border-rose-400/40 text-rose-600 dark:text-rose-400',
};

export function ChangeBoardSection() {
  const { data: changes, isPending, isError, refetch, isRefetching } = useChanges();
  const [changeId, setChangeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  useEffect(() => {
    if (changeId === null && changes && changes.length > 0) {
      setChangeId(changes[0].id);
    }
  }, [changes, changeId]);

  const tasks = useTasks(changeId ?? undefined);

  const filtered = useMemo(() => {
    const list = tasks.data ?? [];
    if (statusFilter === 'all') return list;
    return list.filter((task) => task.status === statusFilter);
  }, [tasks.data, statusFilter]);

  const doneCount = useMemo(
    () => (tasks.data ?? []).filter((task) => task.status === 'done').length,
    [tasks.data],
  );
  const total = tasks.data?.length ?? 0;
  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="变更看板"
        description="TASK 任务单元与 change board 进度"
        isLive
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      {isError ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="text-amber-600 dark:text-amber-400 mb-3">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-base font-medium text-amber-800 dark:text-amber-200 mb-2">Issue-Spec Server 未配置</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 text-center max-w-md mb-4">
            请设置环境变量 <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">ISSUESPEC_SERVER_URL</code> 指向 issue-spec server 地址。
          </p>
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-white dark:bg-amber-950/50 px-3 py-2 rounded font-mono">
            ISSUESPEC_SERVER_URL=http://your-issuespec-server:8091
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {isPending ? (
              <div className="h-9 w-64 rounded shimmer" />
            ) : (
              <Select
                value={changeId ?? undefined}
                onValueChange={(value) => setChangeId(value)}
              >
                <SelectTrigger className="w-full sm:w-72" aria-label="选择变更">
                  <SelectValue placeholder="选择变更" />
                </SelectTrigger>
                <SelectContent>
                  {(changes ?? []).map((change) => (
                    <SelectItem key={change.id} value={change.id}>
                      <span className="truncate">{change.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | TaskStatus)}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="状态筛选">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="open">打开</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {changeId && (
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    任务进度
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {doneCount}/{total} 已完成
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card">
            <CardContent className="p-3 space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2 px-1">
                <GitBranch className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                任务单元
              </h2>
              {!changeId ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  请选择一个变更查看其任务
                </p>
              ) : tasks.isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 rounded shimmer" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  暂无匹配的任务单元
                </p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((task) => (
                    <li key={task.id}>
                      <div className="rounded-lg border border-border p-3 flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap ${TASK_STATUS_STYLES[task.status]}`}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                        <span className="text-sm font-medium truncate flex-1">
                          {task.title}
                        </span>
                        {task.nodeId && (
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            节点 {task.nodeId}
                          </Badge>
                        )}
                        {task.evidence && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            asChild
                          >
                            <a
                              href={task.evidence}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                              证据
                            </a>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
