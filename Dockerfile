# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/uploads ./uploads

# 创建 backups 目录
RUN mkdir -p backups

ENV NODE_ENV=production
ENV PORT=3000
ENV DEPLOYMENT_MODE=network
ENV DATABASE_URL=postgresql://user:password@host:5432/dbname
ENV JWT_SECRET=change-me

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
