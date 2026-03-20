FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json prisma.config.ts ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile && pnpm build

CMD ["node", "apps/bot/dist/index.js"]
