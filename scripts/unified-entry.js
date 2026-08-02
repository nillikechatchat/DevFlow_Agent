#!/usr/bin/env node
// Unified entry point for production
// Starts both issue-spec server and Dashboard in a single process

const { createServer } = require('http');
const path = require('path');

const ISSUESPEC_PORT = process.env.ISSUESPEC_SERVER_PORT || 8091;
const DASHBOARD_PORT = process.env.PORT || 3000;

function log(prefix, msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${prefix}] ${msg}`);
}

async function main() {
  log('INFO', 'Starting services...');
  log('INFO', `Issue-spec server: port ${ISSUESPEC_PORT}`);
  log('INFO', `Dashboard: port ${DASHBOARD_PORT}`);

  // Load issue-spec server
  const issueSpecPath = path.join(__dirname, 'index.js');
  log('INFO', `Loading issue-spec server: ${issueSpecPath}`);
  require(issueSpecPath);
  log('INFO', 'Issue-spec server loaded');

  // Wait for issue-spec server to start
  await new Promise((resolve) => {
    let retries = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:${ISSUESPEC_PORT}/health`);
        if (res.ok) {
          clearInterval(interval);
          log('INFO', `Issue-spec server ready on port ${ISSUESPEC_PORT}`);
          resolve();
        }
      } catch {}
      retries++;
      if (retries > 20) {
        clearInterval(interval);
        log('WARN', 'Issue-spec server may not be ready');
        resolve();
      }
    }, 500);
  });

  // Load Next.js server
  log('INFO', `Starting Dashboard on port ${DASHBOARD_PORT}...`);
  
  // Set env for Next.js
  process.env.ISSUESPEC_SERVER_URL = `http://localhost:${ISSUESPEC_PORT}`;
  process.env.PORT = DASHBOARD_PORT.toString();
  process.env.NODE_ENV = 'production';
  
  // Use Next.js internal API
  const { getRequestHandlers } = require('next/dist/server/lib/start-server');
  const dir = path.join(__dirname, '../../../..'); // workspace root
  
  log('INFO', `Starting Next.js server in: ${dir}`);
  
  const handlers = await getRequestHandlers({
    dir,
    port: DASHBOARD_PORT,
    hostname: '0.0.0.0',
    isDev: false,
    minimalMode: true,
    keepAliveTimeout: 70000,
  });
  
  const { requestHandler, upgradeHandler } = handlers;
  
  const server = createServer(async (req, res) => {
    try {
      await requestHandler(req, res);
    } catch (err) {
      console.error('Request handler error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
  
  server.on('upgrade', async (req, socket, head) => {
    try {
      await upgradeHandler(req, socket, head);
    } catch (err) {
      console.error('Upgrade handler error:', err);
      socket.destroy();
    }
  });
  
  server.listen(DASHBOARD_PORT, '0.0.0.0', () => {
    log('INFO', `Dashboard server ready at http://0.0.0.0:${DASHBOARD_PORT}`);
    log('INFO', `API proxy: http://0.0.0.0:${DASHBOARD_PORT}/api/issuespec`);
  });
  
  server.on('error', (err) => {
    log('ERROR', `Dashboard server error: ${err.message}`);
    process.exit(1);
  });
  
  // Handle shutdown
  function shutdown() {
    log('INFO', 'Shutting down...');
    server.close(() => process.exit(0));
  }
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
  log('INFO', 'All services started successfully');
}

main().catch(err => {
  log('ERROR', `Failed to start: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
