import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = global.prisma || new PrismaClient({
  // log: ['query'], // 取消注释以在开发中记录查询
});

// 在开发环境中，防止热重载创建过多的 PrismaClient 实例
if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}

// 用户相关操作
export const getUserByClerkId = async (clerkId: string) => {
  return db.user.findUnique({
    where: { clerkId },
  });
};

export const createUser = async (data: { clerkId: string; email?: string | null; name?: string | null }) => {
  return db.user.create({
    data,
  });
};

export const updateUser = async (clerkId: string, data: { email?: string | null; name?: string | null }) => {
  return db.user.update({
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
