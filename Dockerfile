# syntax=docker/dockerfile:1.7

########################
# Builder
########################
FROM node:20-bookworm AS builder
WORKDIR /app
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV VITE_SERVER_MODE=true
RUN pnpm vite:build
RUN pnpm prune --prod

########################
# Runtime with FFmpeg + NVENC support
########################
FROM jrottenberg/ffmpeg:6.1-nvidia AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install Node.js 20 and pnpm
RUN apt-get update \
  && apt-get install -y curl ca-certificates gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g corepack \
  && corepack enable pnpm \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"

# App files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

# Runtime env
ENV PORT=4173
ENV VITE_SERVER_MODE=true
ENV VITE_SERVER_API=

EXPOSE 4173
CMD ["node", "server/index.js"]
