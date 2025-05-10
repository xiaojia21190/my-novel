import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUser } from './db';

// 获取当前登录用户的Clerk ID
export const getCurrentClerkId = async () => {
  const { userId } = await auth();
  return userId;
};

// 获取当前登录用户的数据库User记录
export const getCurrentDbUser = async () => {
  // 获取Clerk用户ID
  const clerkId = await getCurrentClerkId();

  // 如果没有用户ID，返回null
  if (!clerkId) {
    return null;
  }

  // 从Clerk获取用户详情
  const user = await currentUser();

  // 如果没有找到用户，返回null
  if (!user) {
    return null;
  }

  // 准备用户数据
  const email = user.emailAddresses[0]?.emailAddress || null;
  const name = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || (email ? email.split('@')[0] : clerkId);

  // 从数据库获取或创建用户
  const dbUser = await getOrCreateUser({
    clerkId,
    email,
    name,
  });

  return dbUser;
};

// 检查用户是否已登录
export const isAuthenticated = async () => {
  const clerkId = await getCurrentClerkId();
  return !!clerkId;
};
