# ============================================================
# AgentTeams-Dashboard - Production Dockerfile
# Issue-spec server is embedded and starts with Dashboard
# ============================================================
# Build:
#   docker build -t agentteams-dashboard:latest .
# Run:
#   docker run -d -p 3000:3000 -p 8091:8091 agentteams-dashboard:latest

FROM node:20-alpine AS builder

WORKDIR /app

# Default basePath is empty for standalone deployment
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

ARG NEXT_PUBLIC_AGENTTEAMS_CONTROLLER_URL=
ENV NEXT_PUBLIC_AGENTTEAMS_CONTROLLER_URL=${NEXT_PUBLIC_AGENTTEAMS_CONTROLLER_URL}

# Install native deps
ARG APK_MIRROR=mirrors.aliyun.com
RUN sed -i "s|dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories && \
    apk add --no-cache ca-certificates curl

# Install all dependencies
ARG NPM_REGISTRY=https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" && \
    npm ci --no-audit --no-fund --legacy-peer-deps

# Copy source and build
COPY . .

# Build issue-spec server first
RUN cd packages/issue-spec-server && npm run build

# Copy unified entry point (hand-written JS, not from TypeScript)
RUN cp scripts/unified-entry.js packages/issue-spec-server/dist/unified-entry.js

# Build Dashboard
RUN npm run build

# Copy unified entry point to standalone
RUN cp packages/issue-spec-server/dist/unified-entry.js .next/standalone/packages/issue-spec-server/dist/ 2>/dev/null || true

# ============================================================
# Runtime image
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV ISSUESPEC_SERVER_PORT=8091

ARG APK_MIRROR=mirrors.aliyun.com
RUN sed -i "s|dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories && \
    apk add --no-cache ca-certificates curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install bash for startup script
RUN apk add --no-cache bash

# Copy all dependencies and built files
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/issue-spec-server ./packages/issue-spec-server
COPY --from=builder --chown=nextjs:nodejs /app/start-dashboard.sh ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs

EXPOSE 3000 8091

CMD ["./start-dashboard.sh", "build"]
