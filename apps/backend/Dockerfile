FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-contracts/package.json packages/shared-contracts/package.json
RUN pnpm install --filter @inicie/backend... --no-frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @inicie/shared-contracts build
RUN pnpm --filter @inicie/backend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
RUN corepack enable && pnpm install --prod --no-frozen-lockfile
CMD ["node", "dist/main.js"]
