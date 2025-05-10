import { PrismaClient } from '@prisma/client';

// PrismaClient是一个重量级对象，应该在应用生命周期内被重用
// 这个模式确保在开发环境的热重载中不会创建多个实例

// 添加prisma到全局类型
declare global {
  // 允许全局 `var` 声明
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 创建PrismaClient实例
export const prisma = globalThis.prisma || new PrismaClient({
  // log: ['query'], // 取消注释以在开发中记录查询
});

// 在开发环境中，防止热重载创建过多的 PrismaClient 实例
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// 用户相关操作 - 从db.ts迁移
export const getUserByClerkId = async (clerkId: string) => {
  return prisma.user.findUnique({
    where: { clerkId },
  });
};

export const createUser = async (data: { clerkId: string; email?: string | null; name?: string | null }) => {
  return prisma.user.create({
    data,
  });
};

export const updateUser = async (clerkId: string, data: { email?: string | null; name?: string | null }) => {
  return prisma.user.update({
    where: { clerkId },
    data,
  });
};

export const getOrCreateUser = async (data: { clerkId: string; email?: string | null; name?: string | null }) => {
  const { clerkId } = data;

  // 尝试查找用户
  const existingUser = await getUserByClerkId(clerkId);

  // 如果用户存在，返回用户
  if (existingUser) {
    return existingUser;
  }

  // 否则创建新用户
  return createUser(data);
};

export default prisma;
