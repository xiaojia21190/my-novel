import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

/**
 * 导入故事 - 从文件或JSON数据创建新故事
 * POST /api/user/story/import
 * 请求体：{ title: string, content: string, format?: string, importType?: 'new' | 'update', storyId?: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    // 获取请求数据
    const body = await req.json();
    const { title, content, format = 'text', importType = 'new', storyId = '' } = body;

    // 验证请求数据
    if (!title || !content) {
      return apiError('无效的请求', '标题和内容不能为空', 400);
    }

    // 验证用户身份
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 处理导入类型
    if (importType === 'update' && storyId) {
      // 更新已有故事
      // 首先检查故事是否存在且属于该用户
      const existingStory = await prisma.story.findUnique({
        where: { id: storyId },
        select: { id: true, userId: true }
      });

      if (!existingStory) {
        return apiError('未找到故事', '请求更新的故事不存在', 404);
      }

      if (existingStory.userId !== auth.dbUser.id) {
        return apiError('访问被拒绝', '您无权更新此故事', 403);
      }

      // 创建当前版本的备份
      await createVersionBackup(storyId, '导入前自动备份', auth.dbUser.name || '用户');

      // 更新故事
      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: {
          title,
          content: content
        }
      });

      return apiSuccess({
        message: '故事已成功更新',
        storyId: updatedStory.id
      });
    } else {
      // 创建新故事
      const newStory = await prisma.story.create({
        data: {
          title,
          content,
          userId: auth.dbUser.id
        }
      });

      // 创建初始版本记录
      await prisma.storyVersion.create({
        data: {
          storyId: newStory.id,
          versionId: `import-${Date.now()}`,
          content: content,
          description: '导入的初始版本',
          changeType: 'import',
          createdBy: auth.dbUser.name || auth.dbUser.email || '用户',
          size: Math.round(new TextEncoder().encode(content).length / 1024) // 计算KB大小
        }
      });

      return apiSuccess({
        message: '故事已成功导入',
        storyId: newStory.id
      }, 201);
    }
  }, '导入故事失败');
}

/**
 * 创建故事版本备份
 */
async function createVersionBackup(storyId: string, description: string, createdBy: string): Promise<void> {
  // 获取当前故事内容
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { content: true }
  });

  if (!story || !story.content) return;

  // 计算内容大小
  const contentSize = new TextEncoder().encode(story.content).length;
  const sizeInKB = Math.round(contentSize / 1024);

  // 创建版本记录
  await prisma.storyVersion.create({
    data: {
      storyId,
      versionId: `backup-${Date.now()}`,
      content: story.content,
      description,
      changeType: 'auto-backup',
      createdBy,
      size: sizeInKB
    }
  });
}
