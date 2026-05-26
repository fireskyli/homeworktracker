import { Router } from 'express';
import { prisma } from '../db';

const PARENT_KEY = 'parent_password';
const DEFAULT_PASSWORD = '1234'; // 初始密码，首次使用后应修改

export const settingsRouter = Router();

// 获取或初始化密码
async function getPassword(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: PARENT_KEY } });
  if (!setting) {
    await prisma.setting.create({ data: { key: PARENT_KEY, value: DEFAULT_PASSWORD } });
    return DEFAULT_PASSWORD;
  }
  return setting.value;
}

// 验证密码
settingsRouter.post('/verify', async (req, res) => {
  try {
    const { password } = req.body;
    const stored = await getPassword();
    if (password === stored) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: '密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: '验证失败' });
  }
});

// 修改密码
settingsRouter.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const stored = await getPassword();
    if (oldPassword !== stored) return res.status(401).json({ error: '原密码错误' });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' });

    await prisma.setting.update({
      where: { key: PARENT_KEY },
      data: { value: newPassword },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '修改失败' });
  }
});
