import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentDbUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Story, Prisma } from '@prisma/client';

// API响应类型
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 验证用户身份并获取数据库用户
 * @param req NextRequest对象
 * @returns 包含验证结果的对象
 */
export async function authenticateUser(req: NextRequest): Promise<{
  isAuthenticated: boolean;
  dbUser: any | null;
  userId: string | null;
  response?: NextResponse;
}> {
  try {
    // 验证用户身份
    const { userId } = await auth();

    if (!userId) {
      return {
        isAuthenticated: false,
        dbUser: null,
        userId: null,
        response: apiError('未授权', '您必须登录才能访问此资源', 401)
      };
    }

    // 获取数据库中的用户
    const dbUser = await getCurrentDbUser();

    if (!dbUser) {
      return {
        isAuthenticated: false,
        dbUser: null,
        userId,
        response: apiError('用户不存在', '无法找到数据库中的用户记录', 404)
      };
    }

    return {
      isAuthenticated: true,
      dbUser,
      userId,
      response: undefined
    };
  } catch (error) {
    console.error('身份验证错误:', error);
    return {
      isAuthenticated: false,
      dbUser: null,
      userId: null,
      response: apiError('身份验证失败', '服务器处理身份验证时发生错误', 500)
    };
  }
}

/**
 * 创建API错误响应
 * @param error 错误标题
 * @param message 详细错误信息
 * @param status HTTP状态码
 * @returns NextResponse错误响应
 */
export function apiError(
  error: string,
  message: string = '',
  status: number = 400
): NextResponse {
  return NextResponse.json(
    { error, message },
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * 创建API成功响应
 * @param data 响应数据
 * @param status HTTP状态码
 * @returns NextResponse成功响应
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * 将故事内容字符串转换为数组
 * @param story 故事对象
 * @returns 带有内容数组的故事对象
 */
export function formatStoryContent<T extends { content: string | null }>(story: T): Omit<T, 'content'> & { content: string[] } {
  return {
    ...story,
    content: story.content ? story.content.split('\n\n') : []
  };
}

/**
 * 将故事内容数组转换为字符串
 * @param content 故事内容数组
 * @returns 内容字符串
 */
export function joinStoryContent(content: string[]): string {
  return content.join('\n\n');
}

/**
 * 异常处理包装器
 * @param handler 异步处理函数
 * @param errorMessage 错误时的消息
 * @returns 包装后的处理函数
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  errorMessage: string = '操作失败'
): Promise<T | NextResponse> {
  return handler().catch((error) => {
    console.error(`${errorMessage}:`, error);
    return apiError(errorMessage, error.message || '服务器处理请求时发生错误', 500);
  });
}
