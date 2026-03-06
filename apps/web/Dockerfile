FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Development
FROM base AS development
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --no-frozen-lockfile
COPY apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "dev"]

# Builder
FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --no-frozen-lockfile
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN pnpm build

# Production
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
