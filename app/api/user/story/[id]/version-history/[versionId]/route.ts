import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

/**
 * 获取特定版本详情
 * GET /api/user/story/[id]/version-history/[versionId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, versionId } = params;

    if (!storyId || !versionId) {
      return apiError('无效的请求', '缺少故事ID或版本ID', 400);
    }

    // 验证用户身份
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取故事信息以验证所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事的版本', 403);
    }

    // 获取版本详情
    const version = await prisma.storyVersion.findFirst({
      where: {
        storyId: storyId,
        versionId: versionId
      }
    });

    if (!version) {
      return apiError('未找到版本', '请求的版本不存在', 404);
    }

    return apiSuccess(version);
  }, '获取版本详情失败');
}

/**
 * 恢复到特定版本
 * POST /api/user/story/[id]/version-history/[versionId]/restore
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, versionId } = params;

    if (!storyId || !versionId) {
      return apiError('无效的请求', '缺少故事ID或版本ID', 400);
    }

    // 验证用户身份
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取故事信息以验证所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true, content: true }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权恢复此故事的版本', 403);
    }

    // 获取要恢复的版本
    const versionToRestore = await prisma.storyVersion.findFirst({
      where: {
        storyId: storyId,
        versionId: versionId
      }
    });

    if (!versionToRestore) {
      return apiError('未找到版本', '请求的版本不存在', 404);
    }

    // 在恢复之前，先创建当前版本的备份
    // 计算当前内容大小
    const currentContentSize = story.content
      ? new TextEncoder().encode(story.content).length
      : 0;
    const currentSizeInKB = Math.round(currentContentSize / 1024);

    // 创建当前状态的备份版本
    await prisma.storyVersion.create({
      data: {
        storyId,
        versionId: `auto-backup-${Date.now()}`,
        content: story.content || '',
        description: '恢复前自动备份',
        changeType: 'auto-backup',
        createdBy: auth.dbUser.name || auth.dbUser.email || '用户',
        size: currentSizeInKB
      }
    });

    // 更新故事内容为所选版本的内容
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        content: versionToRestore.content,
        updatedAt: new Date()
      }
    });

    // 创建恢复操作的记录
    await prisma.storyVersion.create({
      data: {
        storyId,
        versionId: `restore-${Date.now()}`,
        content: versionToRestore.content,
        description: `从版本 ${versionId} 恢复`,
        changeType: 'restore',
        createdBy: auth.dbUser.name || auth.dbUser.email || '用户',
        size: versionToRestore.size || 0
      }
    });

    return apiSuccess({
      message: '已成功恢复到所选版本',
      storyId: updatedStory.id
    });
  }, '恢复版本失败');
}

/**
 * 删除特定版本
 * DELETE /api/user/story/[id]/version-history/[versionId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, versionId } = params;

    if (!storyId || !versionId) {
      return apiError('无效的请求', '缺少故事ID或版本ID', 400);
    }

    // 验证用户身份
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取故事信息以验证所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权删除此故事的版本', 403);
    }

    // 删除指定版本
    const deleteResult = await prisma.storyVersion.deleteMany({
      where: {
        storyId: storyId,
        versionId: versionId
      }
    });

    if (deleteResult.count === 0) {
      return apiError('删除失败', '未找到要删除的版本或删除操作失败', 404);
    }

    return apiSuccess({
      message: '版本已成功删除',
      deletedCount: deleteResult.count
    });
  }, '删除版本失败');
}
