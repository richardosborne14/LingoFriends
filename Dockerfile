# ─────────────────────────────────────────────────────────────────────────────
# LingoFriends — Production Dockerfile
#
# Multi-stage build:
#   Stage 1 (builder): Install deps + build SvelteKit with adapter-node
#   Stage 2 (runner):  Minimal Node runtime image — no devDeps, no build tools
#
# Deployment target: Hetzner VPS behind nginx reverse proxy
# Build: docker build -t lingofriends:latest .
# Run:   docker compose up -d
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching — only re-run npm install if they change
COPY package.json package-lock.json ./

# Install ALL deps (including devDeps needed for the build)
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# Prune devDependencies before copying to runner stage
RUN npm prune --production

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy only what the server needs to run
COPY --from=builder --chown=app:app /app/build ./build
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app

# adapter-node serves on 3000 by default
EXPOSE 3000

# Docker health check — lightweight, no DB dependency
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "build/index.js"]
