'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CircleAlert, CircleCheck, Lock, ShieldCheck } from 'lucide-react';
import type { VerifyResult } from '@/lib/issuespec-api';

interface VerifyPanelProps {
  verify: VerifyResult;
  onArchive?: () => void;
}

export function VerifyPanel({ verify, onArchive }: VerifyPanelProps) {
  const passed = verify.status === 'PASS';

  const items = [
    { label: '阻塞问题', value: String(verify.blocking_questions) },
    { label: '可追溯性', value: verify.traceability === 'ok' ? '正常' : '断裂' },
    { label: 'P0/P1 未闭合', value: String(verify.p0_p1_open) },
    { label: 'PR 检查', value: verify.pr_checks === 'passed' ? '通过' : '未过' },
  ];

  return (
    <div className="space-y-3">
      <Card className={`glass-card ${passed ? 'border-emerald-400/50' : 'border-rose-400/50'}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            {passed ? (
              <CircleCheck className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            ) : (
              <CircleAlert className="w-5 h-5 text-rose-500" aria-hidden="true" />
            )}
            <span className="font-semibold">verify 结果</span>
            <Badge
              variant="outline"
              className={`ml-auto ${
                passed
                  ? 'border-emerald-400/50 text-emerald-600 dark:text-emerald-400'
                  : 'border-rose-400/50 text-rose-600 dark:text-rose-400'
              }`}
            >
              {verify.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {items.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border p-2 text-center"
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-base font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {verify.reasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">无附加说明</p>
            ) : (
              verify.reasons.map((reason, index) => (
                <p key={index} className="text-sm flex items-start gap-1.5">
                  <span className="text-muted-foreground">·</span>
                  {reason}
                </p>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {onArchive && (
        <div className="flex items-center justify-between gap-3">
          {passed ? (
            <Button size="sm" onClick={onArchive}>
              <ShieldCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />
              归档变更
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled className="cursor-not-allowed">
              <Lock className="w-4 h-4 mr-1.5" aria-hidden="true" />
              门禁未通过，归档已禁用
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
