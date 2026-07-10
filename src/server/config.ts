// 部署模式配置
export const DEPLOYMENT_MODE = (process.env.DEPLOYMENT_MODE || 'standalone') as 'standalone' | 'network';
export const STANDALONE_USER_ID = 0;

// JWT 密钥（网络模式必须设置）
export const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
export const JWT_EXPIRES_IN = '7d';

// 功能开关
export const FEATURES = {
  auth: DEPLOYMENT_MODE === 'network',
  registration: DEPLOYMENT_MODE === 'network',
  multiFamily: DEPLOYMENT_MODE === 'network',
} as const;