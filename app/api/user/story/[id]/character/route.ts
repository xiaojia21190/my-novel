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
 * 获取指定故事的所有角色
 * GET /api/user/story/[id]/character
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

    // 获取所有角色
    const characters = await prisma.character.findMany({
      where: { storyId }
    });

    return apiSuccess(characters);
  }, '获取角色失败');
}

/**
 * 创建新角色
 * POST /api/user/story/[id]/character
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
    const { name, description, attributes } = body;

    // 验证必要字段
    if (!name) {
      return apiError('无效的请求数据', '角色名称是必需的', 400);
    }

    // 创建新角色
    const character = await prisma.character.create({
      data: {
        name,
        description: description || '',
        attributes: attributes ? JSON.stringify(attributes) : null,
        userId: auth.dbUser.id,
        storyId
      }
    });

    // 返回新创建的角色
    return apiSuccess(character, 201);
  }, '创建角色失败');
}
