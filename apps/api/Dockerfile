# Production Dockerfile for API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/
COPY packages/notifications/package*.json ./packages/notifications/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build packages
RUN npm run build --workspace=packages/contracts
RUN npm run build --workspace=packages/notifications

# Build API
WORKDIR /app/apps/api
RUN npm run build

# Generate Prisma client
RUN npm run db:generate

# Production stage
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]