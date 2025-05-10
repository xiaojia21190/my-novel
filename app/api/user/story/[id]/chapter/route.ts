import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取指定故事的所有章节
 * GET /api/user/story/[id]/chapter
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const storyId = params.id;

    if (!storyId) {
      return apiError('无效的请求', '缺少故事ID', 400);
    }

    // 验证用户身份
    const auth = await authenticateUser(req);

    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 验证故事归属
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事', 403);
    }

    // 获取所有章节，按顺序排序
    const chapters = await prisma.chapter.findMany({
      where: { storyId },
      orderBy: { order: 'asc' }
    });

    return apiSuccess(chapters);
  }, '获取章节失败');
}

/**
 * 创建新章节
 * POST /api/user/story/[id]/chapter
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const storyId = params.id;

    if (!storyId) {
      return apiError('无效的请求', '缺少故事ID', 400);
    }

    // 验证用户身份
    const auth = await authenticateUser(req);

    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 验证故事归属
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事', 403);
    }

    // 解析请求体
    const body = await req.json();
    const { title, content, summary, notes } = body;

    // 验证必要字段
    if (!title) {
      return apiError('无效的请求数据', '章节标题是必需的', 400);
    }

    // 获取当前最大章节顺序
    const maxOrderChapter = await prisma.chapter.findFirst({
      where: { storyId },
      orderBy: { order: 'desc' }
    });

    const nextOrder = maxOrderChapter ? maxOrderChapter.order + 1 : 1;

    // 创建新章节
    const chapter = await prisma.chapter.create({
      data: {
        title,
        content: content || '',
        summary,
        notes,
        order: nextOrder,
        storyId
      }
    });

    // 返回新创建的章节
    return apiSuccess(chapter, 201);
  }, '创建章节失败');
}
