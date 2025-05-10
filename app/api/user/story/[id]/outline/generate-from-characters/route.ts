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
 * 根据故事角色生成大纲
 * POST /api/user/story/[id]/outline/generate-from-characters
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
      where: { id: storyId },
      include: {
        characters: true,
        chapters: {
          orderBy: { order: 'asc' },
          take: 3 // 只取前三章用于上下文
        }
      }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事', 403);
    }

    // 解析请求体
    const body = await req.json();
    const { theme, genre, autoSave = false, additionalNotes = '' } = body;

    // 确保有角色
    if (!story.characters || story.characters.length === 0) {
      return apiError('无法生成大纲', '故事没有角色', 400);
    }

    // 准备角色信息
    const characterInfo = story.characters.map(char => {
      const attributes = char.attributes ? JSON.parse(char.attributes as string) : {};
      return `角色: ${char.name}
描述: ${char.description || '无详细描述'}
属性: ${Object.entries(attributes)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')}`;
    }).join('\n\n');

    // 准备已有章节内容（如果有）
    let chaptersInfo = '';
    if (story.chapters && story.chapters.length > 0) {
      chaptersInfo = story.chapters.map(chapter =>
        `章节: ${chapter.title}\n摘要: ${chapter.summary || chapter.content.substring(0, 200) + '...'}`
      ).join('\n\n');
    }

    // 调用 AI 服务生成大纲
    const response = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17',
        messages: [
          {
            role: 'system',
            content: `你是一位专业的小说策划师，擅长根据角色设定和背景创建引人入胜的故事大纲。请根据提供的角色信息，创建一个合理、连贯且扣人心弦的故事大纲。

大纲应包含以下部分：
1. 故事概述：核心主题和核心冲突
2. 世界背景：故事发生的背景设定
3. 角色分析：每个角色在故事中的角色和发展轨迹
4. 角色关系图：主要角色之间的关系和互动
5. 情节大纲：按照三幕结构或英雄旅程等经典结构展开的主要情节点
6. 章节规划：建议的章节结构和每章主要内容
7. 冲突和转折：主要冲突点和重要转折
8. 结局构想：故事可能的结局方向

请确保：
- 大纲应充分利用每个角色的特点和背景，使每个角色在故事中都有独特的定位和成长
- 情节应有内在逻辑性，事件之间存在因果关系
- 考虑指定的主题和类型，但也可以创造性地拓展
- 提供足够的细节指导创作，但保留一定的创作空间`
          },
          {
            role: 'user',
            content: `请根据以下信息，为故事"${story.title}"创建一个详细的大纲：

角色信息：
${characterInfo}

${theme ? `故事主题：${theme}\n\n` : ''}
${genre ? `故事类型：${genre}\n\n` : ''}
${chaptersInfo ? `已有章节：\n${chaptersInfo}\n\n` : ''}
${additionalNotes ? `额外说明：${additionalNotes}\n\n` : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      console.error('生成大纲失败:', response.statusText);
      return apiError('生成失败', '调用AI服务时出错', 500);
    }

    // 解析AI响应
    const data = await response.json();
    const generatedOutline = data.choices?.[0]?.message?.content;

    if (!generatedOutline) {
      return apiError('生成失败', 'AI返回的内容为空', 500);
    }

    // 如果请求自动保存，更新故事大纲
    if (autoSave) {
      await prisma.story.update({
        where: { id: storyId },
        data: { outline: generatedOutline }
      });
    }

    return apiSuccess({
      message: '故事大纲已生成',
      outline: generatedOutline,
      saved: autoSave
    });
  }, '生成故事大纲失败');
}
