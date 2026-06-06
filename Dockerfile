# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Dependências de runtime (para HeyGen, playwright pode ser necessário)
RUN apk add --no-cache tini

WORKDIR /app

# Dependências (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Código fonte
COPY src/ ./src/
COPY squads/ ./squads/
COPY scripts/ ./scripts/

# Usuário não-root
USER node

ENTRYPOINT ["/sbin/tini", "--", "node"]
CMD ["src/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('fs').existsSync('./package.json') ? process.exit(0) : process.exit(1)"