# syntax=docker/dockerfile:1
# ============================================================
# JobPilot AI — single-process production image
# Builds the React web app, then serves it + the API from one
# Express process on port 4000 (see apps/api/src/index.ts).
# ============================================================

# ---- Stage 1: build ----
FROM node:22-alpine AS build
RUN npm install -g pnpm@11.7.0
WORKDIR /app

# Install workspace dependencies (lockfile pinned)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
RUN pnpm install --frozen-lockfile

# Build the web client
RUN pnpm --dir apps/web build

# Deploy the API package standalone (includes dev deps so tsx is present)
RUN pnpm --filter @jobpilot/api deploy --legacy /out/api \
    && mkdir -p /out/web \
    && cp -r apps/web/dist /out/web/dist

# ---- Stage 2: runtime ----
FROM node:22-alpine
WORKDIR /app
COPY --from=build /out/api ./api
COPY --from=build /out/web ./web

ENV NODE_ENV=production \
    PORT=4000
EXPOSE 4000

WORKDIR /app/api
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
