import { Router, Request, Response } from 'express';
import { storage } from './storage.js';
import type { ApprovalDecision } from './types.js';

const router = Router();

// Helper to extract string param from Express request
const param = (req: Request, key: string): string => {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
};

// ============ Changes ============

router.get('/changes', (_req: Request, res: Response) => {
  res.json(storage.listChanges());
});

router.get('/changes/:id', (req: Request, res: Response) => {
  const id = param(req, 'id');
  const change = storage.getChange(id);
  if (!change) {
    res.status(404).json({ error: 'Change not found' });
    return;
  }
  const comments = storage.getComments(id);
  res.json({ ...change, comments });
});

// ============ Timeline ============

router.get('/changes/:id/timeline', (req: Request, res: Response) => {
  const id = param(req, 'id');
  const comments = storage.getComments(id);
  res.json(comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
});

// ============ DAG ============

router.get('/changes/:id/dag', (req: Request, res: Response) => {
  const id = param(req, 'id');
  const dag = storage.getDag(id);
  if (!dag) {
    res.status(404).json({ error: 'DAG not found' });
    return;
  }
  res.json(dag);
});

// ============ Tasks ============

router.get('/changes/:id/tasks', (req: Request, res: Response) => {
  const id = param(req, 'id');
  res.json(storage.getTasks(id));
});

// ============ Verify ============

router.get('/changes/:id/verify', (req: Request, res: Response) => {
  const id = param(req, 'id');
  const result = storage.getVerify(id);
  if (!result) {
    res.status(404).json({ error: 'Verify result not found' });
    return;
  }
  res.json(result);
});

router.post('/gateways/verify', (req: Request, res: Response) => {
  const { changeId } = req.body as { changeId: string };
  if (!changeId) {
    res.status(400).json({ error: 'changeId is required' });
    return;
  }

  // Simulate verify process
  const result = {
    change: changeId,
    status: 'PASS' as const,
    blocking_questions: 0,
    traceability: 'ok' as const,
    p0_p1_open: 0,
    pr_checks: 'passed' as const,
    reasons: ['Verify completed successfully'],
  };
  storage.setVerify(changeId, result);
  res.json(result);
});

// ============ Approvals ============

router.get('/changes/:id/approvals', (req: Request, res: Response) => {
  const id = param(req, 'id');
  res.json(storage.getApprovals(id));
});

router.post('/changes/:id/approvals', (req: Request, res: Response) => {
  const { decision, reason, decidedBy } = req.body as {
    decision: ApprovalDecision;
    reason?: string;
    decidedBy?: string;
  };

  if (!decision) {
    res.status(400).json({ error: 'decision is required' });
    return;
  }

  const id = param(req, 'id');
  const approval = {
    id: `appr-${Date.now()}`,
    changeId: id,
    action: decision,
    requestedAt: new Date().toISOString(),
    decidedBy,
    decision,
    decidedAt: new Date().toISOString(),
    reason,
  };
  storage.createApproval(approval);
  res.json(approval);
});

// ============ Health ============

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const issuespecRouter = router;
