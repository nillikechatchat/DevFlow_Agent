import express from 'express';
import cors from 'cors';
import { issuespecRouter } from './routes.js';
import { storage } from './storage.js';

const app = express();
const PORT = process.env.ISSUESPEC_SERVER_PORT || process.env.PORT || 8091;

// Seed data if empty
if (storage.listChanges().length === 0) {
  const defaultData = storage['createDefault']();
  storage['data'] = defaultData;
  storage['save']();
  console.log('Seeded default data');
}

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', issuespecRouter);

// Health check
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', service: 'issue-spec-server', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Issue-spec server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api/changes`);
});
