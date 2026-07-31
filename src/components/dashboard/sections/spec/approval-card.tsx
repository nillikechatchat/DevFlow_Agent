'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { useSubmitApproval } from '@/hooks/use-issuespec-mutations';

interface ApprovalCardProps {
  changeId: string;
  action: string;
  requestedAt: string;
}

export function ApprovalCard({ changeId, action, requestedAt }: ApprovalCardProps) {
  const mutation = useSubmitApproval();

  const requestTime = (() => {
    const date = new Date(requestedAt);
    if (Number.isNaN(date.getTime())) return requestedAt;
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  return (
    <Card className="glass-card border-amber-400/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span className="text-sm font-semibold">高风险动作审批</span>
          <Badge variant="outline" className="ml-auto text-xs border-amber-400/40 text-amber-600 dark:text-amber-400">
            L3
          </Badge>
        </div>
        <p className="text-sm">
          请求执行 <span className="font-medium">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground">请求时间: {requestTime}</p>
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ changeId, decision: 'approved' })
            }
          >
            批准
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-500/40 text-rose-600 dark:text-rose-400"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ changeId, decision: 'rejected' })
            }
          >
            拒绝
          </Button>
          {mutation.isPending && (
            <span className="text-xs text-muted-foreground">提交中...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
