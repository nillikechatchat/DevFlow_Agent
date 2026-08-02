#!/bin/bash
# Start AgentTeams Dashboard with issue-spec server
# Usage: bash start-dashboard.sh [dev|build]

set -e

MODE="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# Check prerequisites
check_prerequisites() {
  if ! command -v node >/dev/null 2>&1; then
    err "Node.js not found. Please install Node.js 20+."
    exit 1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    err "npm not found."
    exit 1
  fi
  ok "Prerequisites check passed"
}

# Main
case "$MODE" in
  dev)
    check_prerequisites
    
    info "Installing dependencies..."
    npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund
    
    info "Starting issue-spec server on port 8091..."
    cd "$SCRIPT_DIR/packages/issue-spec-server"
    NODE_PATH="$SCRIPT_DIR/node_modules" npm start > /tmp/issue-spec-server.log 2>&1 &
    ISSUESPEC_PID=$!
    cd "$SCRIPT_DIR"
    
    # Wait for server to be ready
    for i in {1..15}; do
      if curl -s http://localhost:8091/health >/dev/null 2>&1; then
        ok "Issue-spec server ready (PID: $ISSUESPEC_PID)"
        break
      fi
      sleep 1
    done
    
    info "Starting Dashboard in development mode..."
    info "  Dashboard:    http://localhost:3000"
    info "  Issue-spec:   http://localhost:8091"
    info "  API proxy:    http://localhost:3000/api/issuespec"
    npm run dev
    ;;
  build)
    check_prerequisites
    
    info "Starting unified server entry point..."
    info "  Dashboard:    http://localhost:3000"
    info "  Issue-spec:   http://localhost:8091"
    info "  API proxy:    http://localhost:3000/api/issuespec"
    
    # Run unified entry point (ensure dist is present)
    if [ ! -f "packages/issue-spec-server/dist/unified-entry.js" ]; then
      info "Copying unified-entry.js to dist..."
      cp scripts/unified-entry.js packages/issue-spec-server/dist/ 2>/dev/null || true
    fi
    
    ISSUESPEC_SERVER_PORT=8091 PORT=3000 node packages/issue-spec-server/dist/unified-entry.js
    ;;
  *)
    echo "Usage: bash start-dashboard.sh [dev|build]"
    echo ""
    echo "  dev   - Start in development mode (default)"
    echo "  build - Build and start in production mode"
    exit 1
    ;;
esac
