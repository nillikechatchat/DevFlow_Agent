'use client';

import { useMemo, useState } from 'react';
import { GitBranch, GitPullRequest, ListChecks, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/dashboard/section-header';
import { TypedCommentTimeline } from './spec/typed-comment-timeline';
import { useChanges } from '@/hooks/use-issuespec-changes';
import { useChangeDetail } from '@/hooks/use-issuespec-change-detail';
import type { ChangeStatus, ChangeSummary, IssueStage } from '@/lib/issuespec-api';

const STAGES: { key: IssueStage; label: string }[] = [
  { key: 'proposal', label: 'Proposal' },
  { key: 'design', label: 'Design' },
  { key: 'implement', label: 'Implement' },
];

const STAGE_ICONS: Record<IssueStage, React.ReactNode> = {
  proposal: <Sparkles className="w-4 h-4" aria-hidden="true" />,
  design: <GitBranch className="w-4 h-4" aria-hidden="true" />,
  implement: <GitPullRequest className="w-4 h-4" aria-hidden="true" />,
};

const STATUS_LABELS: Record<ChangeStatus, string> = {
  open: '打开',
  in_progress: '进行中',
  blocked: '阻塞',
  archived: '已归档',
  failed: '失败',
};

export function SpecWorkflowSection() {
  const { data: changes, isPending, isError, refetch, isRefetching } = useChanges();
  const [stage, setStage] = useState<IssueStage>('proposal');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const detail = useChangeDetail(selectedId ?? undefined);

  const filtered = useMemo(() => {
    const list = changes ?? [];
    return list
      .filter((change) => change.stage === stage)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [changes, stage]);

  const handleSelect = (change: ChangeSummary) => {
    setSelectedId(change.id);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Spec 工作流"
        description="Proposal / Design / Implement 三阶段 issue-spec 变更追踪"
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
          <Tabs value={stage} onValueChange={(value) => setStage(value as IssueStage)}>
            <TabsList>
              {STAGES.map(({ key, label }) => {
                const count = changes?.filter((c) => c.stage === key).length ?? 0;
                return (
                  <TabsTrigger key={key} value={key} className="gap-1">
                    {STAGE_ICONS[key]}
                    {label}
                    {!isPending && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardContent className="p-3 space-y-2">
                <h2 className="text-sm font-semibold flex items-center gap-2 px-1">
                  <ListChecks className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  {STAGES.find((s) => s.key === stage)?.label} 变更列表
                </h2>
                {isPending ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-12 rounded shimmer" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    该阶段暂无变更
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filtered.map((change) => (
                      <li key={change.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(change)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            selectedId === change.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{change.title}</span>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {STATUS_LABELS[change.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {change.repo}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-3">
                <h2 className="text-sm font-semibold px-1 pb-2">typed comment 时间线</h2>
                {selectedId ? (
                  detail.isPending ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 rounded shimmer" />
                      ))}
                    </div>
                  ) : detail.isError ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      时间线加载失败，请稍后重试
                    </p>
                  ) : (
                    <TypedCommentTimeline comments={detail.data?.comments ?? []} />
                  )
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    选择左侧变更以查看其结构化评论
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
