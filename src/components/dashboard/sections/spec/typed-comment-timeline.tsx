'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { TypedComment, TypedCommentType } from '@/lib/issuespec-api';

const TYPE_STYLES: Record<TypedCommentType, string> = {
  SPEC: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
  QUESTION: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  ANSWER: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  TASK: 'border-violet-500/40 text-violet-600 dark:text-violet-400',
  PROCESS: 'border-cyan-500/40 text-cyan-600 dark:text-cyan-400',
  REVIEW: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  VERIFY: 'border-slate-500/40 text-slate-600 dark:text-slate-400',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TypedCommentTimelineProps {
  comments: TypedComment[];
  emptyText?: string;
}

export function TypedCommentTimeline({
  comments,
  emptyText = '暂无结构化评论',
}: TypedCommentTimelineProps) {
  if (comments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        {emptyText}
      </div>
    );
  }

  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <ol className="space-y-3">
      {sorted.map((comment) => (
        <li key={comment.id}>
          <Card className="glass-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className={`text-xs ${TYPE_STYLES[comment.type]}`}>
                  {comment.type}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {comment.author}
                </span>
                <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                  {formatTimestamp(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
