#!/bin/bash
# Start AgentTeams Dashboard
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
    
    info "Starting Dashboard in development mode..."
    info "Access: http://localhost:3000"
    info "API:    http://localhost:3000/api/issuespec/changes"
    npm run dev
    ;;
  build)
    check_prerequisites
    
    info "Building project..."
    npm run build
    
    info "Starting production server..."
    info "Access: http://localhost:3000"
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
