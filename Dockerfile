# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.11.1

FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

WORKDIR /app

FROM base AS source

COPY . .

FROM source AS production-dependencies

RUN pnpm install --prod --frozen-lockfile

FROM source AS build

ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
ARG NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=missing-local-publishable-key

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

RUN pnpm install --frozen-lockfile && pnpm -r build

FROM base AS api

ENV NODE_ENV=production
ENV API_PORT=3001

COPY --from=production-dependencies --chown=node:node /app /app
COPY --from=build --chown=node:node /app/apps/api/dist /app/apps/api/dist
COPY --from=build --chown=node:node /app/packages/backend/dist /app/packages/backend/dist
COPY --from=build --chown=node:node /app/packages/shared/dist /app/packages/shared/dist

WORKDIR /app/apps/api
USER node
EXPOSE 3001

CMD ["node", "dist/main.js"]

FROM base AS worker

ENV NODE_ENV=production

COPY --from=production-dependencies --chown=node:node /app /app
COPY --from=build --chown=node:node /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build --chown=node:node /app/packages/backend/dist /app/packages/backend/dist
COPY --from=build --chown=node:node /app/packages/shared/dist /app/packages/shared/dist

WORKDIR /app/apps/worker
USER node

CMD ["node", "dist/main.js"]

FROM base AS web

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=production-dependencies --chown=node:node /app /app
COPY --from=build --chown=node:node /app/apps/web/.next /app/apps/web/.next
COPY --from=build --chown=node:node /app/packages/api-client/dist /app/packages/api-client/dist
COPY --from=build --chown=node:node /app/packages/shared/dist /app/packages/shared/dist

WORKDIR /app/apps/web
USER node
EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start"]
