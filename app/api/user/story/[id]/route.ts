import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentDbUser } from '@/lib/auth';
import { createErrorResponse, createPermissionErrorResponse, withErrorHandling, withPermissionCheck } from '@/lib/api-error-handler';
import { checkStoryOwnership, verifyResourceOwnership } from '@/lib/permissions';

const prisma = new PrismaClient();

/**
 * 获取特定故事详情
 * GET /api/user/story/[id]
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;
  const currentUser = await getCurrentDbUser();

  if (!currentUser) {
    return createErrorResponse('未登录', 401);
  }

  // 使用权限检查确认当前用户是否拥有此故事
  const hasPermission = await checkStoryOwnership(id, currentUser.id);

  if (!hasPermission) {
    return createPermissionErrorResponse('您没有权限查看此故事', 'story', id);
  }

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { order: 'asc' }
      },
      characters: true
    }
  });

  if (!story) {
    return createErrorResponse('故事未找到', 404);
  }

  return Response.json(story);
});

/**
 * 更新特定故事
 * PUT /api/user/story/[id]
 * 使用withPermissionCheck高阶函数包装处理函数，自动进行权限检查
 */
export const PUT = withPermissionCheck(
  // 原始处理函数
  async (
    req: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    const { id } = params;
    const data = await req.json();

    const updatedStory = await prisma.story.update({
      where: { id },
      data
    });

    return Response.json(updatedStory);
  },
  // 权限检查函数
  async (
    req: NextRequest,
    { params }: { params: { id: string } }
  ) => {
    const { id } = params;
    const currentUser = await getCurrentDbUser();

    if (!currentUser) return false;

    return checkStoryOwnership(id, currentUser.id);
  }
);

/**
 * 删除特定故事
 * DELETE /api/user/story/[id]
 * 使用verifyResourceOwnership函数在处理函数内部进行权限验证
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { id } = params;

  try {
    // 验证权限，如果没有权限会抛出错误
    await verifyResourceOwnership('story', id);

    // 删除故事及相关数据
    await prisma.story.delete({
      where: { id }
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    if (error.message && error.message.includes('权限错误')) {
      return createPermissionErrorResponse(error.message, 'story', id);
    }

    throw error; // 由withErrorHandling捕获并处理其他错误
  }
});
