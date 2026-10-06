# Build context: repository root.  docker build -f apps/backend/Dockerfile .

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/backend ./apps/backend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @appraisal/types build
RUN pnpm --filter backend build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/backend ./apps/backend
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/types/dist ./packages/types/dist
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/main"]
