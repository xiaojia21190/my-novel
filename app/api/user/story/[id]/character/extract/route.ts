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
 * 从故事内容中提取角色信息
 * @param content 故事内容
 * @returns 提取的角色信息数组
 */
async function extractCharactersFromContent(content: string): Promise<Array<{ name: string, description: string, attributes?: any }>> {
  try {
    // 构建提取角色的系统提示
    const messages: Array<{ role: string, content: string }> = [
      {
        role: 'system',
        content: `你是一个故事分析助手，专门识别和分析小说中的角色。
请从提供的故事内容中提取所有重要角色的信息，包括他们的名字、描述以及任何可提取的属性（如性格特征、外表特点、背景故事、目标和关系等）。

对于每个角色，请提供以下信息（如有）：
1. 名称：角色的全名或称呼
2. 描述：简短的角色概述
3. 属性：详细的角色特性，包括：
   - appearance: 外表描述
   - personality: 性格特点
   - background: 背景故事
   - goals: 角色目标和动机
   - relationships: 与其他角色的关系

请以JSON格式返回分析结果，示例：
{
  "characters": [
    {
      "name": "角色名称",
      "description": "角色简要描述",
      "attributes": {
        "appearance": "外表描述",
        "personality": "性格特点",
        "background": "背景故事",
        "goals": "目标和动机",
        "relationships": "与其他角色的关系"
      }
    }
  ]
}`
      },
      { role: 'user', content: `故事内容：${content}` }
    ];

    // 调用 OpenAI 兼容服务
    const response = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17',
        messages,
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('提取角色信息失败:', response.statusText);
      return [];
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return [];
    }

    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(responseContent);
      return parsed.characters || [];
    } catch (e) {
      console.error('解析角色JSON失败:', e);
      return [];
    }
  } catch (error) {
    console.error('提取角色信息时出错:', error);
    return [];
  }
}

/**
 * 从故事内容中提取角色并保存
 * POST /api/user/story/[id]/character/extract
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
        chapters: true
      }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事', 403);
    }

    // 收集故事内容用于分析
    let storyContent = story.content || '';

    // 如果有章节，附加章节内容（可选择前几章或所有章节）
    if (story.chapters && story.chapters.length > 0) {
      // 按顺序排序章节
      const sortedChapters = [...story.chapters].sort((a, b) => a.order - b.order);

      // 选择前3章或所有章节（如果少于3章）
      const chaptersToAnalyze = sortedChapters.slice(0, Math.min(3, sortedChapters.length));
      const chaptersContent = chaptersToAnalyze.map(chapter => chapter.content).join('\n\n');

      // 将章节内容添加到故事内容中
      if (storyContent) {
        storyContent += '\n\n' + chaptersContent;
      } else {
        storyContent = chaptersContent;
      }
    }

    if (!storyContent) {
      return apiError('无法提取角色', '故事内容为空', 400);
    }

    // 提取角色信息
    const extractedCharacters = await extractCharactersFromContent(storyContent);

    if (!extractedCharacters || extractedCharacters.length === 0) {
      return apiError('未找到角色', '无法从故事内容中提取角色信息', 400);
    }

    // 将提取的角色保存到数据库（如果用户在请求中设置了autoSave）
    const { autoSave } = await req.json();
    const savedCharacters = [];

    if (autoSave) {
      // 获取已有角色的名称，避免重复
      const existingCharacters = await prisma.character.findMany({
        where: { storyId },
        select: { name: true }
      });
      const existingNames = existingCharacters.map(c => c.name);

      // 逐个保存不重复的角色
      for (const char of extractedCharacters) {
        if (!existingNames.includes(char.name)) {
          const savedChar = await prisma.character.create({
            data: {
              name: char.name,
              description: char.description || '',
              attributes: char.attributes ? JSON.stringify(char.attributes) : null,
              userId: auth.dbUser.id,
              storyId
            }
          });
          savedCharacters.push(savedChar);
          existingNames.push(char.name); // 更新已存在名称列表
        }
      }
    }

    return apiSuccess({
      message: '已成功从故事内容中提取角色信息',
      extractedCharacters,
      savedCharacters: autoSave ? savedCharacters : [],
      autoSaved: autoSave || false
    });
  }, '提取角色失败');
}
