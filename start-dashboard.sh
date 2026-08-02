#!/bin/bash
# Start Dashboard with issue-spec server
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

# Start issue-spec server
start_issuespec() {
  info "Starting issue-spec server..."
  cd "$SCRIPT_DIR/packages/issue-spec-server"
  
  # Start in background
  npm start > /tmp/issue-spec-server.log 2>&1 &
  ISSUESPEC_PID=$!
  cd "$SCRIPT_DIR"
  
  # Wait for server to be ready
  for i in {1..15}; do
    if curl -s http://localhost:8091/health >/dev/null 2>&1; then
      ok "Issue-spec server ready (PID: $ISSUESPEC_PID)"
      return 0
    fi
    sleep 1
  done
  
  warn "Issue-spec server may not be ready yet"
  return 1
}

# Stop issue-spec server
stop_issuespec() {
  if [ -n "${ISSUESPEC_PID:-}" ]; then
    kill "$ISSUESPEC_PID" 2>/dev/null || true
    ok "Issue-spec server stopped"
  fi
}

# Trap to stop on exit
trap stop_issuespec EXIT

# Main
case "$MODE" in
  dev)
    check_prerequisites
    
    info "Installing dependencies..."
    npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund
    
    start_issuespec
    
    info "Starting Dashboard in development mode..."
    npm run dev
    ;;
  build)
    check_prerequisites
    
    info "Building project..."
    npm run build
    
    info "Starting production servers..."
    start_issuespec
    
    # Set env and start
    export ISSUESPEC_SERVER_URL=http://localhost:8091
    npm start
    ;;
  *)
    echo "Usage: bash start-dashboard.sh [dev|build]"
    echo ""
    echo "  dev   - Start in development mode (default)"
    echo "  build - Build and start in production mode"
    exit 1
    ;;
esac
