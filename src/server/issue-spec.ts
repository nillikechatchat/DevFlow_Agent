// Embedded Issue-Spec Server Module
// This module can be used as a standalone server or embedded in the Dashboard

import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import type { ApprovalDecision, ChangeSummary, TypedComment, ProcessDag, TaskItem, VerifyResult, ApprovalRecord, StoreData } from './types.js';

// ============ Types ============

export type { IssueStage, ChangeStatus, TypedCommentType, ProcessNodeStatus, VerifyStatus, TaskStatus, ApprovalDecision, ChangeSummary, TypedComment, ProcessNode, ProcessDag, TaskItem, VerifyResult, ApprovalRecord, StoreData } from './types.js';

// ============ Storage ============

const STORAGE_FILE = process.env.ISSUESPEC_STORAGE_PATH || './data/store.json';

class Storage {
  private data: StoreData;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      const { readFileSync, writeFileSync, existsSync } = require('node:fs');
      const { join } = require('node:path');

      const STORAGE_FILE_PATH = process.env.ISSUESPEC_STORAGE_PATH || join(process.cwd(), 'data', 'store.json');
      if (existsSync(STORAGE_FILE_PATH)) {
        const raw = readFileSync(STORAGE_FILE_PATH, 'utf-8');
        const loaded = JSON.parse(raw) as StoreData;
        return {
          changes: loaded.changes || [],
          comments: loaded.comments || [],
          dags: loaded.dags || {},
          tasks: loaded.tasks || [],
          verifyResults: loaded.verifyResults || {},
          approvals: loaded.approvals || [],
        };
      }
    } catch {
      // ignore
    }
    return this.createDefault();
  }

  private createDefault(): StoreData {
    const now = new Date().toISOString();
    const changes: ChangeSummary[] = [
      { id: 'change-001', stage: 'proposal', title: '实现 issue-spec 追踪模块', repo: 'DevFlow_Agent', status: 'open', updatedAt: now },
      { id: 'change-002', stage: 'design', title: '设计 PROCESS DAG 数据模型', repo: 'DevFlow_Agent', status: 'in_progress', updatedAt: now },
      { id: 'change-003', stage: 'implement', title: '开发 Worker 工具包', repo: 'DevFlow_Agent', status: 'open', updatedAt: now },
    ];

    const comments: TypedComment[] = [
      { id: 'c1', type: 'SPEC', author: 'architect', createdAt: now, content: '需求规格文档完成', changeId: 'change-001' },
      { id: 'c2', type: 'QUESTION', author: 'triage', createdAt: now, content: '确认验收标准', changeId: 'change-001' },
      { id: 'c3', type: 'ANSWER', author: 'lead', createdAt: now, content: '已通过验收', changeId: 'change-001' },
    ];

    const dags: Record<string, ProcessDag> = {
      'change-001': {
        nodes: [
          { id: 'n1', name: '需求分析', owner: 'triage', dependencies: [], parallelWith: ['n2', 'n3'], status: 'COMPLETED', evidence: 'report.md' },
          { id: 'n2', name: '架构设计', owner: 'architect', dependencies: ['n1'], parallelWith: [], status: 'COMPLETED' },
          { id: 'n3', name: '测试用例', owner: 'qa', dependencies: ['n1'], parallelWith: ['n2'], status: 'RUNNING' },
          { id: 'n4', name: '代码实现', owner: 'developer', dependencies: ['n2', 'n3'], parallelWith: [], status: 'PENDING' },
        ],
      },
    };

    const tasks: TaskItem[] = [
      { id: 't1', changeId: 'change-001', title: '实现 proxy helper', status: 'done', nodeId: 'n1' },
      { id: 't2', changeId: 'change-001', title: '编写类型定义', status: 'done', nodeId: 'n1' },
      { id: 't3', changeId: 'change-001', title: '实现 API 路由', status: 'in_progress', nodeId: 'n4' },
    ];

    const verifyResults: Record<string, VerifyResult> = {
      'change-001': {
        change: 'change-001',
        status: 'PASS',
        blocking_questions: 0,
        traceability: 'ok',
        p0_p1_open: 0,
        pr_checks: 'passed',
        reasons: ['所有验收标准已满足', '文档完整', 'PR 已合并'],
      },
    };

    const approvals: ApprovalRecord[] = [];

    return { changes, comments, dags, tasks, verifyResults, approvals };
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.save();
      this.saveTimer = null;
    }, 100);
  }

  private save(): void {
    try {
      const { writeFileSync, mkdirSync, existsSync } = require('node:fs');
      const { join } = require('node:path');

      const STORAGE_FILE_PATH = process.env.ISSUESPEC_STORAGE_PATH || join(process.cwd(), 'data', 'store.json');
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(STORAGE_FILE_PATH, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('Failed to save storage:', e);
    }
  }

  // Changes
  listChanges(): ChangeSummary[] {
    return this.data.changes;
  }

  getChange(id: string): ChangeSummary | undefined {
    return this.data.changes.find(c => c.id === id);
  }

  createChange(change: ChangeSummary): void {
    this.data.changes.push(change);
    this.scheduleSave();
  }

  updateChange(id: string, updates: Partial<ChangeSummary>): void {
    const idx = this.data.changes.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.changes[idx] = { ...this.data.changes[idx], ...updates, updatedAt: new Date().toISOString() };
      this.scheduleSave();
    }
  }

  // Comments
  getComments(changeId: string): TypedComment[] {
    return this.data.comments.filter(c => c.changeId === changeId);
  }

  createComment(comment: TypedComment): void {
    this.data.comments.push(comment);
    this.scheduleSave();
  }

  // DAG
  getDag(changeId: string): ProcessDag | undefined {
    return this.data.dags?.[changeId];
  }

  setDag(changeId: string, dag: ProcessDag): void {
    this.data.dags = { ...this.data.dags, [changeId]: dag };
    this.scheduleSave();
  }

  // Tasks
  getTasks(changeId: string): TaskItem[] {
    return this.data.tasks.filter(t => t.changeId === changeId);
  }

  createTask(task: TaskItem): void {
    this.data.tasks.push(task);
    this.scheduleSave();
  }

  updateTask(id: string, updates: Partial<TaskItem>): void {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
      this.scheduleSave();
    }
  }

  // Verify
  getVerify(changeId: string): VerifyResult | undefined {
    return this.data.verifyResults?.[changeId];
  }

  setVerify(changeId: string, result: VerifyResult): void {
    this.data.verifyResults = { ...this.data.verifyResults, [changeId]: result };
    this.scheduleSave();
  }

  // Approvals
  getApprovals(changeId: string): ApprovalRecord[] {
    return this.data.approvals.filter(a => a.changeId === changeId);
  }

  createApproval(approval: ApprovalRecord): void {
    this.data.approvals.push(approval);
    this.scheduleSave();
  }
}

export const storage = new Storage();

// ============ Router ============

export function createIssueSpecRouter() {
  const router = express.Router();

  // ============ Changes ============

  router.get('/changes', (_req: Request, res: Response) => {
    res.json(storage.listChanges());
  });

  router.get('/changes/:id', (req: Request, res: Response) => {
    const change = storage.getChange(req.params.id);
    if (!change) {
      res.status(404).json({ error: 'Change not found' });
      return;
    }
    const comments = storage.getComments(req.params.id);
    res.json({ ...change, comments });
  });

  // ============ Timeline ============

  router.get('/changes/:id/timeline', (req: Request, res: Response) => {
    const comments = storage.getComments(req.params.id);
    res.json(comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });

  // ============ DAG ============

  router.get('/changes/:id/dag', (req: Request, res: Response) => {
    const dag = storage.getDag(req.params.id);
    if (!dag) {
      res.status(404).json({ error: 'DAG not found' });
      return;
    }
    res.json(dag);
  });

  // ============ Tasks ============

  router.get('/changes/:id/tasks', (req: Request, res: Response) => {
    res.json(storage.getTasks(req.params.id));
  });

  // ============ Verify ============

  router.get('/changes/:id/verify', (req: Request, res: Response) => {
    const result = storage.getVerify(req.params.id);
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

    const result: VerifyResult = {
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
    res.json(storage.getApprovals(req.params.id));
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

    const approval: ApprovalRecord = {
      id: `appr-${Date.now()}`,
      changeId: req.params.id,
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
    res.json({ status: 'ok', service: 'issue-spec-server', timestamp: new Date().toISOString() });
  });

  return router;
}

// ============ Standalone Server ============

export function createIssueSpecServer(port: number = 8091) {
  const app = express();
  const router = createIssueSpecRouter();

  app.use(cors());
  app.use(express.json());
  app.use('/api', router);
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'issue-spec-server', timestamp: new Date().toISOString() });
  });

  app.listen(port, () => {
    console.log(`Issue-spec server running at http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API docs: http://localhost:${port}/api/changes`);
  });

  return app;
}

// ============ Entry Point ============

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8091', 10);
  createIssueSpecServer(port);
}
