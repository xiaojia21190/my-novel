import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';
import { generateVersionId } from '@/lib/auto-save';

/**
 * 获取故事版本历史
 * GET /api/user/story/[id]/version-history
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

    // 验证用户身份并检查资源所有权
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取故事信息
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事的版本历史', 403);
    }

    // 查询版本历史
    const versionHistory = await prisma.storyVersion.findMany({
      where: { storyId: storyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionId: true,
        description: true,
        createdAt: true,
        createdBy: true,
        changeType: true,
        size: true
      }
    });

    return apiSuccess(versionHistory);
  }, '获取版本历史失败');
}

/**
 * 创建新的版本记录
 * POST /api/user/story/[id]/version-history
 * 请求体：{ content: string, changeType: string, description?: string }
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

    // 验证用户身份并检查资源所有权
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取请求数据
    const body = await req.json();
    const { content, changeType, description = '版本更新' } = body;

    if (!content) {
      return apiError('无效的请求', '内容不能为空', 400);
    }

    // 获取故事信息
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权为此故事创建版本', 403);
    }

    // 生成版本ID
    const versionId = generateVersionId();

    // 计算内容大小
    const contentSize = new TextEncoder().encode(content).length;
    const sizeInKB = Math.round(contentSize / 1024);

    // 创建新版本记录
    const newVersion = await prisma.storyVersion.create({
      data: {
        storyId,
        versionId,
        content,
        description,
        changeType: changeType || 'manual',
        createdBy: auth.dbUser.name || auth.dbUser.email || '用户',
        size: sizeInKB
      }
    });

    // 返回创建的版本信息（不包含内容以减少响应大小）
    return apiSuccess({
      id: newVersion.id,
      versionId: newVersion.versionId,
      description: newVersion.description,
      createdAt: newVersion.createdAt,
      createdBy: newVersion.createdBy,
      changeType: newVersion.changeType,
      size: newVersion.size
    }, 201);
  }, '创建版本记录失败');
}
