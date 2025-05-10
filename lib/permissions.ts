import { PrismaClient } from '@prisma/client';
import { getCurrentDbUser } from './auth';

const prisma = new PrismaClient();

/**
 * 检查用户是否拥有特定的故事
 * @param storyId 故事ID
 * @param userId 用户ID (可选，默认使用当前登录用户)
 * @returns 布尔值，表示用户是否有权限
 */
export const checkStoryOwnership = async (storyId: string, userId?: string): Promise<boolean> => {
  try {
    // 如果没有提供userId，获取当前用户
    if (!userId) {
      const currentUser = await getCurrentDbUser();
      if (!currentUser) return false;
      userId = currentUser.id;
    }

    // 查询故事是否属于该用户
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true }
    });

    return story?.userId === userId;
  } catch (error) {
    console.error('检查故事所有权时出错:', error);
    return false;
  }
};

/**
 * 检查用户是否拥有特定的章节
 * @param chapterId 章节ID
 * @param userId 用户ID (可选，默认使用当前登录用户)
 * @returns 布尔值，表示用户是否有权限
 */
export const checkChapterOwnership = async (chapterId: string, userId?: string): Promise<boolean> => {
  try {
    // 如果没有提供userId，获取当前用户
    if (!userId) {
      const currentUser = await getCurrentDbUser();
      if (!currentUser) return false;
      userId = currentUser.id;
    }

    // 查询章节及其所属故事的用户ID
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { story: { select: { userId: true } } }
    });

    return chapter?.story.userId === userId;
  } catch (error) {
    console.error('检查章节所有权时出错:', error);
    return false;
  }
};

/**
 * 检查用户是否拥有特定的角色
 * @param characterId 角色ID
 * @param userId 用户ID (可选，默认使用当前登录用户)
 * @returns 布尔值，表示用户是否有权限
 */
export const checkCharacterOwnership = async (characterId: string, userId?: string): Promise<boolean> => {
  try {
    // 如果没有提供userId，获取当前用户
    if (!userId) {
      const currentUser = await getCurrentDbUser();
      if (!currentUser) return false;
      userId = currentUser.id;
    }

    // 查询角色是否属于该用户
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { userId: true, storyId: true }
    });

    // 如果角色直接属于用户，或者属于用户拥有的故事
    if (character?.userId === userId) return true;

    if (character?.storyId) {
      return await checkStoryOwnership(character.storyId, userId);
    }

    return false;
  } catch (error) {
    console.error('检查角色所有权时出错:', error);
    return false;
  }
};

/**
 * 通用资源所有权验证函数
 * @param resourceType 资源类型 ('story' | 'chapter' | 'character')
 * @param resourceId 资源ID
 * @param userId 用户ID (可选，默认使用当前登录用户)
 * @returns 布尔值，表示用户是否有权限
 */
export const checkResourceOwnership = async (
  resourceType: 'story' | 'chapter' | 'character',
  resourceId: string,
  userId?: string
): Promise<boolean> => {
  switch (resourceType) {
    case 'story':
      return checkStoryOwnership(resourceId, userId);
    case 'chapter':
      return checkChapterOwnership(resourceId, userId);
    case 'character':
      return checkCharacterOwnership(resourceId, userId);
    default:
      return false;
  }
};

/**
 * 验证并确保用户拥有资源，如果不拥有则抛出错误
 * 用于API路由处理中
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @param userId 用户ID (可选)
 * @throws 如果用户没有权限，抛出错误
 */
export const verifyResourceOwnership = async (
  resourceType: 'story' | 'chapter' | 'character',
  resourceId: string,
  userId?: string
): Promise<void> => {
  const hasPermission = await checkResourceOwnership(resourceType, resourceId, userId);

  if (!hasPermission) {
    throw new Error(`权限错误: 您没有操作此${getResourceTypeText(resourceType)}的权限`);
  }
};

/**
 * 获取资源类型的中文文本
 */
const getResourceTypeText = (type: 'story' | 'chapter' | 'character'): string => {
  switch (type) {
    case 'story': return '故事';
    case 'chapter': return '章节';
    case 'character': return '角色';
    default: return '资源';
  }
};
