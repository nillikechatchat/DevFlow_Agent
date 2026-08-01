#!/usr/bin/env node
// Minimal issue-spec mock server for local development
// Usage: node mock-issue-spec-server.js
// Default: http://localhost:8091

const http = require('http');

const MOCK_CHANGES = [
  {
    id: 'change-001',
    stage: 'proposal',
    title: '实现 issue-spec 追踪模块',
    repo: 'DevFlow_Agent',
    status: 'open',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'change-002',
    stage: 'design',
    title: '设计 PROCESS DAG 数据模型',
    repo: 'DevFlow_Agent',
    status: 'in_progress',
    updatedAt: '2026-08-01T09:30:00Z',
  },
];

const MOCK_TIMELINE = [
  { id: 'c1', type: 'SPEC', author: 'architect', createdAt: '2026-08-01T10:00:00Z', content: '需求规格文档' },
  { id: 'c2', type: 'QUESTION', author: 'triage', createdAt: '2026-08-01T10:05:00Z', content: '确认验收标准' },
  { id: 'c3', type: 'ANSWER', author: 'lead', createdAt: '2026-08-01T10:10:00Z', content: '已通过验收' },
];

const MOCK_DAG = {
  nodes: [
    { id: 'n1', name: '需求分析', owner: 'triage', dependencies: [], parallelWith: ['n2', 'n3'], status: 'COMPLETED', evidence: 'report.md' },
    { id: 'n2', name: '架构设计', owner: 'architect', dependencies: ['n1'], parallelWith: [], status: 'COMPLETED' },
    { id: 'n3', name: '测试用例', owner: 'qa', dependencies: ['n1'], parallelWith: ['n2'], status: 'RUNNING' },
    { id: 'n4', name: '代码实现', owner: 'developer', dependencies: ['n2', 'n3'], parallelWith: [], status: 'PENDING' },
  ],
};

const MOCK_VERIFY = {
  change: 'change-001',
  status: 'PASS',
  blocking_questions: 0,
  traceability: 'ok',
  p0_p1_open: 0,
  pr_checks: 'passed',
  reasons: ['所有验收标准已满足', '文档完整', 'PR 已合并'],
};

const server = http.createServer((req, res) => {
  const { url, method } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  let body;
  let status = 200;
  
  if (url === '/changes' && method === 'GET') {
    body = MOCK_CHANGES;
  } else if (url.match(/^\/changes\/[^\/]+$/)) {
    body = { ...MOCK_CHANGES[0], comments: MOCK_TIMELINE };
  } else if (url.match(/^\/changes\/[^\/]+\/timeline$/)) {
    body = MOCK_TIMELINE;
  } else if (url.match(/^\/changes\/[^\/]+\/dag$/)) {
    body = MOCK_DAG;
  } else if (url.match(/^\/changes\/[^\/]+\/tasks$/)) {
    body = [];
  } else if (url.match(/^\/changes\/[^\/]+\/verify$/)) {
    body = MOCK_VERIFY;
  } else if (url.match(/^\/changes\/[^\/]+\/approvals$/)) {
    body = [];
  } else if (url === '/gateways/verify' && method === 'POST') {
    body = MOCK_VERIFY;
  } else {
    status = 404;
    body = { error: 'Not found' };
  }
  
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

const PORT = process.env.PORT || 8091;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock issue-spec server running at http://localhost:${PORT}`);
});
