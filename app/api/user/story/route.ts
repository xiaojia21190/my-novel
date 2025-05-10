import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  formatStoryContent,
  joinStoryContent,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

/**
 * 获取当前用户的所有故事
 * GET /api/user/story
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    // 验证用户身份
    const auth = await authenticateUser(req);

    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取用户的所有故事
    const stories = await prisma.story.findMany({
      where: { userId: auth.dbUser.id },
      orderBy: { updatedAt: 'desc' }
    });

    // 将故事内容从字符串转换为数组
    const formattedStories = stories.map(formatStoryContent);

    return apiSuccess(formattedStories);
  }, '获取故事失败');
}

/**
 * 创建新故事
 * POST /api/user/story
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    // 验证用户身份
    const auth = await authenticateUser(req);

    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 解析请求体
    const body = await req.json();
    const { title, content } = body;

    // 验证请求数据
    if (!title || !content || !Array.isArray(content)) {
      return apiError('无效的请求数据', '标题和内容是必需的，内容必须是数组', 400);
    }

    // 将内容数组转换为字符串存储
    const contentString = joinStoryContent(content);

    // 创建新故事
    const story = await prisma.story.create({
      data: {
        title,
        content: contentString,
        userId: auth.dbUser.id
      }
    });

    // 返回新创建的故事，将内容转换回数组格式
    return apiSuccess(formatStoryContent(story), 201);
  }, '创建故事失败');
}
