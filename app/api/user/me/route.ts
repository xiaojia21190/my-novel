import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCurrentDbUser } from '@/lib/auth';

/**
 * 获取当前登录用户信息的API
 * 此API端点受到保护，只有登录用户才能访问
 *
 * 返回从数据库获取的用户信息，结合Clerk的会话数据
 */
export async function GET(req: NextRequest) {
  try {
    // 使用Clerk的auth()函数获取认证信息
    const { userId, sessionId } = await auth();

    // 检查用户是否已登录
    if (!userId || !sessionId) {
      return new NextResponse(
        JSON.stringify({
          error: "未授权",
          message: "您必须登录才能访问此资源"
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 并行获取当前用户的Clerk信息和数据库信息
    const [clerkUser, dbUser] = await Promise.all([
      currentUser(),
      getCurrentDbUser()
    ]);

    if (!clerkUser || !dbUser) {
      return new NextResponse(
        JSON.stringify({ error: "用户不存在" }),
        { status: 404 }
      );
    }

    // 获取会话相关信息
    const sessionInfo = {
      sessionId: sessionId,
      lastActiveAt: clerkUser.lastActiveAt,
      createdAt: clerkUser.createdAt
    };

    // 返回组合的用户信息
    return NextResponse.json({
      // 数据库存储的信息
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,

      // Clerk用户信息
      clerkId: userId,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,

      // 会话信息
      session: sessionInfo,

      // 状态信息
      isSignedIn: true,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return new NextResponse(
      JSON.stringify({ error: "获取用户信息失败" }),
      { status: 500 }
    );
  }
}
