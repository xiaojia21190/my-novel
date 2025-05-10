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
 * 获取故事大纲
 * GET /api/user/story/[id]/outline
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

    // 返回故事大纲，如果为空则返回null
    return apiSuccess({ outline: story.outline || null });
  }, '获取故事大纲失败');
}

/**
 * 更新故事大纲
 * PUT /api/user/story/[id]/outline
 */
export async function PUT(
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
    const { outline } = body;

    // 更新故事大纲
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: { outline }
    });

    return apiSuccess({
      message: '故事大纲已更新',
      outline: updatedStory.outline
    });
  }, '更新故事大纲失败');
}

/**
 * 自动生成故事大纲（基于现有章节或内容）
 * POST /api/user/story/[id]/outline/generate
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

    // 验证故事归属和获取完整内容
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          orderBy: { order: 'asc' }
        },
        characters: true
      }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事', 403);
    }

    // 收集所有章节内容
    let storyContent = '';

    // 如果有原始内容，使用它
    if (story.content) {
      storyContent = story.content;
    }

    // 如果有章节，合并它们
    if (story.chapters && story.chapters.length > 0) {
      // 为简单起见，只取每个章节的前300个字符作为概览
      const chapterSummaries = story.chapters.map(
        chapter => `${chapter.title}: ${chapter.content.substring(0, 300)}${chapter.content.length > 300 ? '...' : ''}`
      );
      storyContent = chapterSummaries.join('\n\n');
    }

    if (!storyContent) {
      return apiError('无法生成大纲', '故事内容为空', 400);
    }

    try {
      // 准备角色信息
      let characterInfo = '';
      if (story.characters && story.characters.length > 0) {
        // 格式化角色信息
        const formattedCharacters = story.characters.map(char => {
          let charInfo = `${char.name}: ${char.description || ''}`;

          // 添加属性信息（如果有）
          if (char.attributes) {
            try {
              const attrs = JSON.parse(char.attributes as string);
              if (attrs) {
                // 格式化重要的关系属性
                if (attrs.relationships) {
                  charInfo += `\n  关系: ${attrs.relationships}`;
                }
                if (attrs.goals) {
                  charInfo += `\n  目标: ${attrs.goals}`;
                }
              }
            } catch (e) {
              console.warn(`解析角色 ${char.name} 的属性时出错:`, e);
            }
          }

          return charInfo;
        }).join('\n\n');

        characterInfo = `主要角色信息:\n${formattedCharacters}`;
      }

      // 调用 OpenAI API 生成大纲
      const openaiResponse = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
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
              content: `你是一个专业的小说编辑，擅长分析故事并创建结构化大纲。请基于提供的故事内容和角色信息，生成一个全面的故事大纲，包括以下要素：

1. 故事概要：包括整体主题和核心冲突
2. 主要角色分析：角色特点、动机和发展轨迹
3. 角色关系图：主要角色之间的关系和互动
4. 情节概述：按时间顺序或叙事结构排列的主要情节点
5. 章节规划：建议的章节结构和每章关键内容
6. 故事弧：主要角色的情感和发展弧线
7. 冲突和解决：主要冲突点和可能的解决方案
8. 主题探索：故事中探讨的核心主题和寓意

请确保大纲既有帮助作者理清思路的结构性，又有保持创意空间的灵活性。大纲应清晰地展示角色之间的关系发展和情节的逻辑连贯性。`
            },
            { role: 'user', content: `故事标题：${story.title}\n\n${characterInfo ? characterInfo + '\n\n' : ''}故事内容：${storyContent}` }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!openaiResponse.ok) {
        console.error('OpenAI API 错误:', openaiResponse.statusText);
        return apiError('生成大纲失败', '调用AI服务时出错', 500);
      }

      const openaiData = await openaiResponse.json();
      const generatedOutline = openaiData.choices?.[0]?.message?.content;

      if (!generatedOutline) {
        return apiError('生成大纲失败', 'AI返回的内容为空', 500);
      }

      // 更新故事大纲
      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: { outline: generatedOutline }
      });

      return apiSuccess({
        message: '故事大纲已生成',
        outline: updatedStory.outline
      });
    } catch (error) {
      console.error('生成大纲错误:', error);
      return apiError('生成大纲失败', '服务器内部错误', 500);
    }
  }, '自动生成故事大纲失败');
}
