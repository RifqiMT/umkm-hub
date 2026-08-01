# Production API image for Render / Railway / Fly.io
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Migrate then start (Render/Railway set PORT; Nest reads PORT from env)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
