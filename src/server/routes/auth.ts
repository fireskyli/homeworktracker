import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { signJwt } from '../middleware/auth';
import { FEATURES } from '../config';

export const authRouter = Router();

// 注册
authRouter.post('/register', async (req, res) => {
  if (!FEATURES.registration) {
    return res.status(403).json({ error: '当前模式不支持注册' });
  }

  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: '邮箱、密码和昵称为必填' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    // bcrypt 哈希
    const passwordHash = await bcrypt.hash(password, 12);

    const now = new Date().toISOString();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: 'parent',
        createdAt: now,
        updatedAt: now,
      },
    });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
authRouter.post('/login', async (req, res) => {
  if (!FEATURES.auth) {
    return res.status(403).json({ error: '当前模式不支持登录' });
  }

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = signJwt({ userId: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
authRouter.get('/me', async (req, res) => {
  if (!FEATURES.auth) {
    return res.json({ user: null, mode: 'standalone' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, displayName: true, role: true },
    });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user, mode: 'network' });
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});