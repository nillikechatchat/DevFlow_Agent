import { StoreData, ChangeSummary, TypedComment, ProcessDag, TaskItem, VerifyResult, ApprovalRecord } from './types.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STORAGE_FILE = process.env.ISSUESPEC_STORAGE_PATH || './data/store.json';

class Storage {
  private data: StoreData;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      if (existsSync(STORAGE_FILE)) {
        const raw = readFileSync(STORAGE_FILE, 'utf-8');
        const loaded = JSON.parse(raw) as StoreData;
        // Ensure all fields exist
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
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) {
        import('node:fs').then(fs => fs.mkdirSync(dir, { recursive: true }));
      }
      writeFileSync(STORAGE_FILE, JSON.stringify(this.data, null, 2));
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
