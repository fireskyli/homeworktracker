import { Router } from 'express';
import { prisma } from '../db';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const productsRouter = Router();

// 图片上传配置（复用 upload.ts 的配置）
const uploadsDir = path.resolve(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/webp 格式'));
    }
  },
});

// 验证家长密码的中间件
async function verifyParentPassword(password: string, userId: number): Promise<boolean> {
  const setting = await prisma.setting.findFirst({ where: { key: 'parent_password', userId } });
  return setting?.value === password;
}

// 获取所有上架商品
productsRouter.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: 1, userId: req.userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 创建商品（家长密码验证）
productsRouter.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, description, points, password } = req.body;

    if (!name || !points) {
      return res.status(400).json({ error: '商品名称和积分必填' });
    }

    if (!await verifyParentPassword(password, req.userId)) {
      return res.status(403).json({ error: '密码错误' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        points: Number(points),
        photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString(),
        userId: req.userId,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 更新商品（家长密码验证）
productsRouter.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, description, points, password } = req.body;

    if (!await verifyParentPassword(password, req.userId)) {
      return res.status(403).json({ error: '密码错误' });
    }

    const existing = await prisma.product.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: '商品不存在' });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (points !== undefined) data.points = Number(points);
    if (req.file) data.photoUrl = `/uploads/${req.file.filename}`;

    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品（软删除，家长密码验证）
productsRouter.delete('/:id', async (req, res) => {
  try {
    const { password } = req.body;

    if (!await verifyParentPassword(password, req.userId)) {
      return res.status(403).json({ error: '密码错误' });
    }

    const existing = await prisma.product.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: '商品不存在' });

    await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { isActive: 0 },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除商品失败' });
  }
});
