# ============================================================
# AgentTeams-Dashboard - Production Dockerfile (Next.js standalone + issue-spec server)
# ============================================================
# Build:
#   docker build -t agentteams-dashboard:latest .
# Run:
#   docker run -p 3000:3000 -p 8091:8091 \
#     -e AGENTTEAMS_CONTROLLER_URL=http://agentteams-controller:8090 \
#     agentteams-dashboard:latest

FROM node:20-alpine AS builder

WORKDIR /app

# Default basePath is empty for standalone deployment (served at root).
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

# Optional build-time default for the browser-side controller URL.
ARG NEXT_PUBLIC_AGENTTEAMS_CONTROLLER_URL=
ENV NEXT_PUBLIC_AGENTTEAMS_CONTROLLER_URL=${NEXT_PUBLIC_AGENTTEAMS_CONTROLLER_URL}

# Install native deps
ARG APK_MIRROR=mirrors.aliyun.com
RUN sed -i "s|dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories && \
    apk add --no-cache ca-certificates

# Install dependencies (lockfile included for reproducible builds)
ARG NPM_REGISTRY=https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" && \
    npm ci --no-audit --no-fund --legacy-peer-deps

# Copy source and build Dashboard
COPY . .
RUN npm run build

# ============================================================
# Build issue-spec server
# ============================================================
FROM node:20-alpine AS issue-spec-builder

WORKDIR /app/packages/issue-spec-server

ARG APK_MIRROR=mirrors.aliyun.com
RUN sed -i "s|dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories && \
    apk add --no-cache ca-certificates

COPY packages/issue-spec-server/package.json ./
RUN npm install --no-audit --no-fund --production=false

COPY packages/issue-spec-server ./
RUN npm run build

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
    apk add --no-cache ca-certificates

# Create non-root user and persistent data directory
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/db /app/packages/issue-spec-server/data && \
    chown -R nextjs:nodejs /app

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy issue-spec server
COPY --from=issue-spec-builder --chown=nextjs:nodejs /app/packages/issue-spec-server/dist ./packages/issue-spec-server/dist
COPY --from=issue-spec-builder --chown=nextjs:nodejs /app/packages/issue-spec-server/package.json ./packages/issue-spec-server/
COPY --from=issue-spec-builder --chown=nextjs:nodejs /app/packages/issue-spec-server/node_modules ./packages/issue-spec-server/node_modules

USER nextjs

EXPOSE 3000 8091

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start issue-spec server in background' >> /app/start.sh && \
    echo 'cd /app/packages/issue-spec-server && node dist/index.js &' >> /app/start.sh && \
    echo 'ISSUESPEC_PID=$!' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start Dashboard' >> /app/start.sh && \
    echo 'cd /app && node server.js' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Wait for both processes' >> /app/start.sh && \
    echo 'wait' >> /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
