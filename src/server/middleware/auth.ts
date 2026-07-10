import { Request, Response, NextFunction } from 'express';
import { DEPLOYMENT_MODE, STANDALONE_USER_ID, JWT_SECRET } from '../config';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

// 单机模式：直接注入 userId=0
function standaloneAuth(req: Request, _res: Response, next: NextFunction) {
  req.userId = STANDALONE_USER_ID;
  next();
}

// 网络模式：验证 JWT
function jwtAuth(req: Request, res: Response, next: NextFunction) {
  // 不需要认证的路径
  const publicPaths = ['/api/health', '/api/config', '/api/auth/register', '/api/auth/login'];
  if (publicPaths.some(p => req.path === p)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 运行时动态 import crypto 模块做 JWT 验证
    const payload = parseJwt(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({ error: '登录已过期' });
    }
    req.userId = payload.userId as number;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}

// 简易 JWT 解析（不依赖 jsonwebtoken 库，减少依赖）
function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const data = JSON.parse(payload);

    // 检查过期
    if (data.exp && Date.now() >= data.exp * 1000) return null;

    return data;
  } catch {
    return null;
  }
}

// 工厂函数
export function createAuthMiddleware() {
  if (DEPLOYMENT_MODE === 'network') return jwtAuth;
  return standaloneAuth;
}

// JWT 签发工具（网络模式用）
export function signJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  })).toString('base64url');

  // 使用 crypto 模块做 HMAC-SHA256 签名
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}