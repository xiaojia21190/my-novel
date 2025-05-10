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
 * 获取指定章节
 * GET /api/user/story/[id]/chapter/[chapterId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; chapterId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, chapterId } = params;

    if (!storyId || !chapterId) {
      return apiError('无效的请求', '缺少故事ID或章节ID', 400);
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

    // 获取章节
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      return apiError('未找到章节', '请求的章节不存在', 404);
    }

    if (chapter.storyId !== storyId) {
      return apiError('访问被拒绝', '此章节不属于指定的故事', 403);
    }

    return apiSuccess(chapter);
  }, '获取章节失败');
}

/**
 * 更新指定章节
 * PUT /api/user/story/[id]/chapter/[chapterId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; chapterId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, chapterId } = params;

    if (!storyId || !chapterId) {
      return apiError('无效的请求', '缺少故事ID或章节ID', 400);
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

    // 验证章节存在并属于该故事
    const existingChapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!existingChapter) {
      return apiError('未找到章节', '请求的章节不存在', 404);
    }

    if (existingChapter.storyId !== storyId) {
      return apiError('访问被拒绝', '此章节不属于指定的故事', 403);
    }

    // 解析请求体
    const body = await req.json();
    const { title, content, summary, notes, order } = body;

    // 验证必要字段
    if (!title) {
      return apiError('无效的请求数据', '章节标题是必需的', 400);
    }

    // 如果修改了顺序，可能需要调整其他章节的顺序
    if (order !== undefined && order !== existingChapter.order) {
      // 这里简单处理：如果指定了新顺序，我们直接更新，不调整其他章节
      // 在实际应用中，可能需要更复杂的逻辑来维护章节顺序的连续性
    }

    // 保存章节历史版本
    let versionHistory = [];
    try {
      if (existingChapter.versionHistory) {
        versionHistory = JSON.parse(existingChapter.versionHistory);
      }
    } catch (e) {
      console.error('解析版本历史失败:', e);
      versionHistory = [];
    }

    // 添加当前版本到历史记录
    versionHistory.push({
      timestamp: new Date().toISOString(),
      title: existingChapter.title,
      content: existingChapter.content,
      summary: existingChapter.summary,
      notes: existingChapter.notes
    });

    // 只保留最近的5个版本
    if (versionHistory.length > 5) {
      versionHistory = versionHistory.slice(-5);
    }

    // 更新章节
    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title,
        content: content !== undefined ? content : existingChapter.content,
        summary: summary !== undefined ? summary : existingChapter.summary,
        notes: notes !== undefined ? notes : existingChapter.notes,
        order: order !== undefined ? order : existingChapter.order,
        versionHistory: JSON.stringify(versionHistory),
        updatedAt: new Date()
      }
    });

    return apiSuccess(updatedChapter);
  }, '更新章节失败');
}

/**
 * 删除指定章节
 * DELETE /api/user/story/[id]/chapter/[chapterId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; chapterId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, chapterId } = params;

    if (!storyId || !chapterId) {
      return apiError('无效的请求', '缺少故事ID或章节ID', 400);
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

    // 验证章节存在并属于该故事
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      return apiError('未找到章节', '请求的章节不存在', 404);
    }

    if (chapter.storyId !== storyId) {
      return apiError('访问被拒绝', '此章节不属于指定的故事', 403);
    }

    // 删除章节
    await prisma.chapter.delete({
      where: { id: chapterId }
    });

    // 重新排序剩余章节
    const remainingChapters = await prisma.chapter.findMany({
      where: { storyId },
      orderBy: { order: 'asc' }
    });

    // 更新剩余章节的顺序
    for (let i = 0; i < remainingChapters.length; i++) {
      await prisma.chapter.update({
        where: { id: remainingChapters[i].id },
        data: { order: i + 1 }
      });
    }

    return apiSuccess({ message: '章节已删除' });
  }, '删除章节失败');
}
