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
 * 分析角色在章节中的表现与发展
 * POST /api/user/story/[id]/character/analyze
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
    const { characterIds, chapterIds } = body;

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return apiError('无效的请求数据', '请提供角色ID数组', 400);
    }

    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      return apiError('无效的请求数据', '请提供章节ID数组', 400);
    }

    // 获取角色信息
    const characters = await prisma.character.findMany({
      where: {
        id: { in: characterIds },
        storyId: storyId
      }
    });

    if (characters.length === 0) {
      return apiError('未找到角色', '请求的角色不存在或不属于此故事', 404);
    }

    // 格式化角色信息，解析attributes JSON
    const formattedCharacters = characters.map(character => ({
      ...character,
      attributes: character.attributes ? JSON.parse(character.attributes as string) : null
    }));

    // 获取章节内容
    const chapters = await prisma.chapter.findMany({
      where: {
        id: { in: chapterIds },
        storyId: storyId
      },
      orderBy: { order: 'asc' }
    });

    if (chapters.length === 0) {
      return apiError('未找到章节', '请求的章节不存在或不属于此故事', 404);
    }

    // 准备AI分析所需的数据
    const characterInfo = formattedCharacters.map(char => {
      const attributes = char.attributes || {};
      return `角色: ${char.name}
描述: ${char.description || '无详细描述'}
属性: ${Object.entries(attributes)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')}`;
    }).join('\n\n');

    const chaptersContent = chapters.map(chapter =>
      `章节: ${chapter.title}\n内容:\n${chapter.content}`
    ).join('\n\n');

    // 调用 AI 服务分析角色表现
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
            content: `你是一位专业的文学分析助手，擅长分析小说中角色的表现和发展。请分析提供的章节内容中，指定角色的表现、行为、发展和情感变化。

分析应包括以下方面：
1. 角色出场与参与: 角色在各章节中的出场次数、场景和参与度
2. 角色行为与决策: 角色做出的关键决定和行动
3. 情感变化: 角色的情感状态及其变化
4. 人物关系: 与其他角色的互动和关系发展
5. 角色发展: 角色在章节中的成长或变化
6. 与设定的一致性: 角色的行为是否与其设定的属性一致
7. 改进建议: 如何使角色更加立体或解决可能的不一致问题

请以JSON格式返回分析结果，每个角色的分析单独成一个对象，包含上述所有方面：

{
  "results": [
    {
      "characterId": "角色ID",
      "name": "角色名称",
      "analysis": {
        "appearances": [章节出现情况的详细分析],
        "actions": [关键行动和决策分析],
        "emotions": [情感变化分析],
        "relationships": [与其他角色的关系分析],
        "development": [角色发展轨迹分析],
        "consistency": [与角色设定一致性分析],
        "suggestions": [改进建议]
      }
    }
  ]
}`
          },
          {
            role: 'user',
            content: `请分析以下章节中指定角色的表现和发展：\n\n角色信息：\n${characterInfo}\n\n章节内容：\n${chaptersContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('分析角色表现失败:', response.statusText);
      return apiError('分析失败', '调用AI服务时出错', 500);
    }

    // 解析AI响应
    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content;

    if (!analysisResult) {
      return apiError('分析失败', 'AI返回的内容为空', 500);
    }

    try {
      const parsedResult = JSON.parse(analysisResult);

      // 匹配角色ID和分析结果
      const enhancedResults = parsedResult.results.map((result: any) => {
        const matchedCharacter = formattedCharacters.find(c => c.name === result.name);
        return {
          ...result,
          characterId: matchedCharacter?.id || null
        };
      });

      return apiSuccess({
        message: '角色分析完成',
        analysis: {
          ...parsedResult,
          results: enhancedResults
        }
      });
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return apiError('解析分析结果失败', '服务器内部错误', 500);
    }
  }, '分析角色表现失败');
}
