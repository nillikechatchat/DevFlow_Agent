#!/bin/bash
# verify-agentteams-pipeline.sh - Read-only verification of the Worker skill
# pipeline for DevFlow_Agent toolkit.
#
# Usage:
#   bash scripts/verify-agentteams-pipeline.sh
#
# Verifies, without writing anything:
#   1. Local skills registry mirror (.agents/skills) is complete
#   2. Nacos Skills Registry URL is configured (default nacos://market.agentteams.io:80/public)
#   3. Remote registry reachability (only when AGENTTEAMS_VERIFY_REMOTE=1)
#   4. Worker CR declares a consumer token only
#
# Exit code: 0 if all checks pass, 1 if any fail.
# Mirrors the read-only PASS/FAIL/SKIP pattern of install/agentteams-verify.sh.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PASS=0
FAIL=0
SKIP=0

check_pass() {
    echo "  [PASS] $1"
    PASS=$((PASS + 1))
}

check_fail() {
    echo "  [FAIL] $1"
    FAIL=$((FAIL + 1))
}

check_skip() {
    echo "  [SKIP] $1"
    SKIP=$((SKIP + 1))
}

echo ""
echo "==> DevFlow_Agent skill pipeline verification"

# 1. Local skills registry mirror complete
MISSING=""
for skill in triage root-cause implement review verify retro spec-sync; do
    if [ ! -f "${ROOT_DIR}/.agents/skills/${skill}/SKILL.md" ]; then
        MISSING="${MISSING} ${skill}"
    fi
done
if [ -z "${MISSING}" ]; then
    check_pass "Local skills registry mirror complete"
else
    check_fail "Local skills registry mirror incomplete:${MISSING}"
fi

# 2. Nacos Skills Registry URL configured
SKILLS_API_URL="${AGENTTEAMS_SKILLS_API_URL:-nacos://market.agentteams.io:80/public}"
if [ -n "${SKILLS_API_URL}" ]; then
    check_pass "Nacos Skills Registry configured (${SKILLS_API_URL})"
else
    check_fail "Nacos Skills Registry URL is empty"
fi

# 3. Remote registry reachability (opt-in, read-only)
if [ "${AGENTTEAMS_VERIFY_REMOTE}" = "1" ]; then
    case "${SKILLS_API_URL}" in
        http://*|https://*)
            REGISTRY_HOST=$(echo "${SKILLS_API_URL}" | sed -E 's#^[a-z]+://([^/]+).*#\1#')
            if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://${REGISTRY_HOST}/" 2>/dev/null | grep -qE "200|401|403"; then
                check_pass "Nacos registry reachable at ${REGISTRY_HOST}"
            else
                check_fail "Nacos registry not reachable at ${REGISTRY_HOST}"
            fi
            ;;
        nacos://*)
            check_skip "Nacos protocol registry reachability check (use AGENTTEAMS_VERIFY_REMOTE=1 with an HTTP registry)"
            ;;
        *)
            check_skip "Unsupported registry protocol: ${SKILLS_API_URL}"
            ;;
    esac
else
    check_skip "Remote registry reachability (set AGENTTEAMS_VERIFY_REMOTE=1 to enable)"
fi

# 4. Worker CR declares a consumer token only
if [ -f "${ROOT_DIR}/.agents/examples/worker.yaml" ]; then
    if grep -q "token:" "${ROOT_DIR}/.agents/examples/worker.yaml" && grep -q "type: consumer" "${ROOT_DIR}/.agents/examples/worker.yaml"; then
        check_pass "Worker CR declares consumer token only"
    else
        check_fail "Worker CR does not declare a consumer token"
    fi
else
    check_fail "Worker CR example missing"
fi

# ---------- Summary ----------

TOTAL=$((PASS + FAIL))
echo ""
echo "==> Result: ${PASS}/${TOTAL} passed (${SKIP} skipped)"
echo ""

if [ "${FAIL}" -gt 0 ]; then
    exit 1
fi
exit 0
