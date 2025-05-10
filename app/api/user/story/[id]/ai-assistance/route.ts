import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';
import { Message } from 'ai';

/**
 * 提供AI辅助功能
 * POST /api/user/story/[id]/ai-assistance
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
    const { assistanceType, prompt, selectedChapterIds, selectedCharacterIds } = body;

    if (!assistanceType || !prompt) {
      return apiError('无效的请求数据', '缺少必要的参数', 400);
    }

    // 获取相关章节和角色信息（如果需要）
    let promptText = prompt;
    let systemPrompt = '';
    let temperature = 0.7;
    let maxTokens = 1000;
    let characterInfo = '';

    // 如果需要角色信息
    if (selectedCharacterIds && selectedCharacterIds.length > 0) {
      const characters = await prisma.character.findMany({
        where: {
          id: { in: selectedCharacterIds },
          storyId
        }
      });

      if (characters.length > 0) {
        characterInfo = characters.map(char => {
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
    }

    // 根据辅助类型设置系统提示
    switch (assistanceType) {
      case 'plot_idea':
        systemPrompt = `你是一位专业的小说情节顾问，擅长根据用户的提示生成创意性的情节发展建议。请根据提供的情节点或角色信息，详细阐述可能的情节发展方向，包括冲突设置、转折点和角色互动。

你的建议应该：
1. 具有合理性和故事张力
2. 考虑角色动机和背景
3. 提供清晰的情节结构
4. 包含足够的细节以激发写作灵感

请提供详细而有深度的情节建议，不要过于宽泛，而是提供具体的场景、对话或行动建议。`;
        break;

      case 'character_dialogue':
        if (selectedCharacterIds.length === 0) {
          return apiError('无效的请求数据', '请提供至少一个角色ID', 400);
        }

        systemPrompt = `你是一位角色对话专家，能够根据角色的设定和特点，以其独特的声音创作对话或独白。请根据提供的角色信息和上下文，创作符合该角色风格的对话或独白。

请确保：
1. 对话风格、用词和表达方式与角色的背景、性格和经历一致
2. 体现角色的核心价值观、动机和目标
3. 反映角色当前的情感状态和与其他角色的关系
4. 对话既要推动情节，又要展现角色特点

请直接返回该角色的对话或独白内容，不需要额外的解释。`;
        break;

      case 'plot_suggestion':
        systemPrompt = `你是一位小说情节顾问，擅长为作者提供有创意且合理的情节发展建议。请根据当前内容和上下文，提供2-3个可能的情节发展方向。

你的建议应该：
1. 提供几个不同的可能发展方向，各有侧重
2. 确保建议的情节与已有内容、角色设定和大纲保持连贯
3. 包含足够的细节让作者能看到这一方向的潜力
4. 点出每个方向的优势和可能带来的戏剧性效果
5. 考虑情节在节奏、张力和情感上的发展

请以简洁明了的项目形式提供建议，每个建议包含简短的情节概述和可能的发展方向。`;
        temperature = 0.8;
        maxTokens = 800;
        break;

      case 'setting_development':
        systemPrompt = `你是一位世界设定专家，擅长丰富和拓展小说的世界观和背景设定。请根据提供的背景信息，详细阐述世界设定的方方面面，包括历史、地理、文化、政治、经济等。

你的世界设定应该：
1. 内部逻辑一致，有深度和可信度
2. 与故事主题和角色背景相互呼应
3. 包含丰富的细节，但注重与情节相关的元素
4. 考虑设定如何影响角色行为和情节发展

请提供详细而系统化的世界设定，避免过于空洞的描述，而是关注那些能增加故事深度和张力的元素。`;
        maxTokens = 1200;
        break;

      case 'writing_style':
        systemPrompt = `你是一位文学风格专家，擅长根据作者的需求调整和完善文本的写作风格。请根据提供的文本样本和要求，提供符合特定风格的写作指导或文本重写。

你的风格建议应该：
1. 精准捕捉所需风格的核心特点（如修辞手法、句式结构、语气等）
2. 提供具体的改写示例，展示如何应用这种风格
3. 解释风格选择如何增强故事的情感和主题
4. 保持内容的原意，同时提升表达的艺术性

请提供实用的风格指导和具体的改写示例，帮助作者掌握所需的写作风格。`;
        break;

      default:
        return apiError('无效的辅助类型', '不支持的AI辅助功能类型', 400);
    }

    try {
      // 准备消息数组
      const messages: Message[] = [
        { role: 'system', content: systemPrompt, id: 'system-' + Date.now().toString() },
        { role: 'user', content: `${promptText}\n\n${characterInfo ? `角色信息：\n${characterInfo}` : ''}`, id: 'user-' + Date.now().toString() }
      ];

      // 调用AI服务 - 修改为不使用流式响应
      const response = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-preview-04-17',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature,
          max_tokens: maxTokens,
          stream: false // 禁用流式响应
        }),
      });

      if (!response.ok) {
        throw new Error('调用AI服务时出错: ' + response.statusText);
      }

      // 解析完整响应
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || '';

      // 返回标准的JSON响应
      return apiSuccess({
        result
      });
    } catch (error) {
      console.error('提供AI辅助失败:', error);
      return apiError('辅助失败', error instanceof Error ? error.message : '调用AI服务时出错', 500);
    }
  }, '提供AI辅助失败');
}
