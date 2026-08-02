import express from 'express';
import cors from 'cors';
import { issuespecRouter } from './routes.js';

const app = express();
const PORT = process.env.PORT || 8091;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', issuespecRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'issue-spec-server' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Issue-spec server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
