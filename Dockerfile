# ============================================
# Stage 1: Base
# ============================================
FROM node:20-alpine AS base

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    tini \
    curl

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY yarn.lock* ./

FROM base AS development

# Instalar TODAS as dependências (incluindo devDependencies)
RUN if [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile; \
    else \
        npm ci; \
    fi

# Copiar código fonte
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Usar tini para gerenciar processos
ENTRYPOINT ["/sbin/tini", "--"]

# Comando padrão (pode ser sobrescrito)
CMD ["npm", "run", "dev"]

FROM base AS production

# Definir ambiente de produção
ENV NODE_ENV=production

# Instalar APENAS dependências de produção
RUN if [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile --production; \
    else \
        npm ci --only=production; \
    fi

# Copiar código fonte
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Usar tini para gerenciar processos
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de produção
CMD ["npm", "start"]
