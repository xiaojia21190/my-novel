import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

/**
 * 根据大纲生成章节内容
 * POST /api/user/story/[id]/chapter/generate-from-outline
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
          orderBy: { order: 'asc' }
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
    const { outlineSection, chapterTitle } = body;

    if (!outlineSection || !chapterTitle) {
      return apiError('无效的请求数据', '请提供大纲内容和章节标题', 400);
    }

    // 准备角色和故事信息
    let characterInfo = '';
    if (story.characters && story.characters.length > 0) {
      characterInfo = story.characters.map(char => {
        let info = `${char.name}: ${char.description || ''}`;
        if (char.attributes) {
          try {
            const attrs = JSON.parse(char.attributes as string);
            if (attrs && Object.keys(attrs).length > 0) {
              const details = Object.entries(attrs)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              info += ` (${details})`;
            }
          } catch (e) { }
        }
        return info;
      }).join('\n');
    }

    // 获取故事摘要和世界设定
    const storySummary = story.summary || '';
    const worldSetting = story.worldSetting || '';

    // 准备前一章节内容（如果有）
    let previousChapterContent = '';
    let previousChapterSummary = '';

    if (story.chapters && story.chapters.length > 0) {
      const lastChapter = story.chapters[story.chapters.length - 1];
      previousChapterContent = lastChapter.content;
      previousChapterSummary = lastChapter.summary || '';
    }

    // 准备系统提示和用户提示
    const systemPrompt = `你是一位专业的小说创作助手，擅长根据大纲和已有内容创作连贯、生动的章节。请根据提供的故事大纲部分，创作符合标题的章节内容。

请特别注意以下几点：
1. 章节内容必须忠实反映大纲中的情节发展
2. 角色的言行举止应与其设定保持一致
3. 内容应与前一章节（如果有）保持情节和风格的连贯性
4. 文笔应生动流畅，章节长度适中（约1500-2000字）
5. 包含适当的对话、描述和心理活动
6. 保持故事世界观设定的一致性

请直接返回创作的章节内容，不要添加标题、注释或其他说明。`;

    const userPrompt = `请根据以下信息，创作标题为"${chapterTitle}"的章节：

故事大纲部分：
${outlineSection}

${storySummary ? `故事概要：\n${storySummary}\n\n` : ''}
${worldSetting ? `世界设定：\n${worldSetting}\n\n` : ''}
${characterInfo ? `角色信息：\n${characterInfo}\n\n` : ''}
${previousChapterContent ? `前一章节内容：\n${previousChapterContent}\n\n` : ''}
${previousChapterSummary ? `前一章节摘要：\n${previousChapterSummary}` : ''}`;

    // 调用 AI 服务生成章节内容
    const response = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        stream: false // 禁用流式输出
      }),
    });

    if (!response.ok) {
      console.error('生成章节内容失败:', response.statusText);
      return apiError('生成失败', '调用AI服务时出错', 500);
    }

    // 解析AI响应
    const data = await response.json();
    const chapterContent = data.choices?.[0]?.message?.content;

    if (!chapterContent) {
      return apiError('生成失败', 'AI返回的内容为空', 500);
    }

    return apiSuccess({
      content: chapterContent,
      title: chapterTitle
    });
  }, '生成章节内容失败');
}
