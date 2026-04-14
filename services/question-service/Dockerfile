# ── Stage 1: Build ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ── Stage 2: Production ────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Copy seed data so the seeder can read it at runtime
COPY src/data/leetcode_questions.json ./dist/data/leetcode_questions.json

EXPOSE 8080

CMD ["node", "dist/index.js"]
