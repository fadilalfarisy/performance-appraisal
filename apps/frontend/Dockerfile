# Build context: repository root.  docker build -f apps/frontend/Dockerfile .

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @appraisal/types build
RUN pnpm --filter frontend build

FROM nginx:alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
