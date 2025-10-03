FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/contracts/package.json ./packages/contracts/
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build contracts first
WORKDIR /app/packages/contracts
RUN npm run build

# Build API
WORKDIR /app/apps/api
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/packages/contracts/dist ./node_modules/@vms/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./node_modules/@vms/contracts/

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma schema and generate client
COPY --from=builder /app/packages/contracts/prisma ./prisma
RUN npx prisma generate

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]