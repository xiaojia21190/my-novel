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
 * 获取指定角色
 * GET /api/user/story/[id]/character/[characterId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; characterId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, characterId } = params;

    if (!storyId || !characterId) {
      return apiError('无效的请求', '缺少故事ID或角色ID', 400);
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

    // 获取角色
    const character = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return apiError('未找到角色', '请求的角色不存在', 404);
    }

    if (character.storyId !== storyId) {
      return apiError('访问被拒绝', '此角色不属于指定的故事', 403);
    }

    // 解析attributes JSON字段
    const formattedCharacter = {
      ...character,
      attributes: character.attributes ? JSON.parse(character.attributes as string) : null
    };

    return apiSuccess(formattedCharacter);
  }, '获取角色失败');
}

/**
 * 更新角色
 * PUT /api/user/story/[id]/character/[characterId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; characterId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, characterId } = params;

    if (!storyId || !characterId) {
      return apiError('无效的请求', '缺少故事ID或角色ID', 400);
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

    // 验证角色存在和归属
    const existingCharacter = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!existingCharacter) {
      return apiError('未找到角色', '请求更新的角色不存在', 404);
    }

    if (existingCharacter.storyId !== storyId) {
      return apiError('访问被拒绝', '此角色不属于指定的故事', 403);
    }

    // 解析请求体
    const body = await req.json();
    const { name, description, attributes } = body;

    // 至少需要一个要更新的字段
    if (!name && description === undefined && attributes === undefined) {
      return apiError('无效的请求数据', '至少需要提供一个要更新的字段', 400);
    }

    // 准备更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (attributes !== undefined) updateData.attributes = attributes ? JSON.stringify(attributes) : null;

    // 更新角色
    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: updateData
    });

    // 解析attributes JSON字段
    const formattedCharacter = {
      ...updatedCharacter,
      attributes: updatedCharacter.attributes ? JSON.parse(updatedCharacter.attributes as string) : null
    };

    return apiSuccess({
      message: '角色已更新',
      character: formattedCharacter
    });
  }, '更新角色失败');
}

/**
 * 删除角色
 * DELETE /api/user/story/[id]/character/[characterId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; characterId: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { id: storyId, characterId } = params;

    if (!storyId || !characterId) {
      return apiError('无效的请求', '缺少故事ID或角色ID', 400);
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

    // 验证角色存在和归属
    const character = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return apiError('未找到角色', '请求删除的角色不存在', 404);
    }

    if (character.storyId !== storyId) {
      return apiError('访问被拒绝', '此角色不属于指定的故事', 403);
    }

    // 删除角色
    await prisma.character.delete({
      where: { id: characterId }
    });

    return apiSuccess({ message: '角色已成功删除' });
  }, '删除角色失败');
}
