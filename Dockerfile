# ============================================================
# AgentTeams-Dashboard - Production Dockerfile
# Issue-spec server is now embedded in the Dashboard
# ============================================================
# Build:
#   docker build -t agentteams-dashboard:latest .
# Run:
#   docker run -d -p 3000:3000 \
#     -e ISSUESPEC_STORAGE_PATH=/app/db/store.json \
#     agentteams-dashboard:latest

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
    apk add --no-cache ca-certificates

# Install all dependencies (includes workspaces)
ARG NPM_REGISTRY=https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" && \
    npm ci --no-audit --no-fund --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# ============================================================
# Runtime image
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ARG APK_MIRROR=mirrors.aliyun.com
RUN sed -i "s|dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories && \
    apk add --no-cache ca-certificates

# Create non-root user and persistent data directory
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/db && \
    chown -R nextjs:nodejs /app

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy server-side issue-spec module
COPY --from=builder --chown=nextjs:nodejs /app/src/server ./src/server

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
