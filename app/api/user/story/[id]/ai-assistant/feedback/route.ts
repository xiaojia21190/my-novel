import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

// 定义消息类型
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  id: string;
}

/**
 * 获取AI故事总结反馈
 * POST /api/user/story/[id]/ai-assistant/feedback
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

    // 获取故事数据
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: { orderBy: { order: 'asc' } },
        characters: true
      }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权访问此故事', 403);
    }

    // 准备AI总结反馈的内容
    const storyContent = story.chapters.map(chapter => chapter.content).join('\n\n');
    const charactersInfo = story.characters.map(c => `${c.name}: ${c.description}`).join('\n');

    // 构建系统提示
    const systemPrompt = `你是一位专业的文学评论家和小说顾问。提供对故事的全面反馈，包括情节、人物、主题和写作风格的评价。
    给出具体、有建设性的改进建议。你的分析应该深入且全面，但表达要清晰易懂。
    以尊重作者创意的方式提供反馈，找出作品的优点和需要改进的地方。`;

    // 构建用户提示
    const promptText = `请对以下故事提供文学分析和反馈。提供对情节发展、人物塑造、主题和写作风格的评价，以及改进建议。

    故事标题: ${story.title}
    故事内容:
    ${storyContent}`;

    // 设置AI参数
    const temperature = 0.7;
    const maxTokens = 1500;

    try {
      // 准备消息数组
      const messages: Message[] = [
        { role: 'system', content: systemPrompt, id: 'system-' + Date.now().toString() },
        { role: 'user', content: `${promptText}\n\n${charactersInfo ? `角色信息：\n${charactersInfo}` : ''}`, id: 'user-' + Date.now().toString() }
      ];

      // 调用AI服务 - 修改为不使用流式响应
      const response = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gemini-2.5-flash-preview-04-17',
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
      const feedback = data.choices?.[0]?.message?.content || '';

      // 返回标准的JSON响应
      return apiSuccess({
        result: feedback,
        title: "故事总结与反馈"
      });
    } catch (error) {
      console.error('AI总结反馈生成失败:', error);

      // 如果AI调用失败，使用备用的模拟反馈（生产环境中可以去掉）
      const fallbackFeedback = `
《${story.title}》整体评价与建议

注意：这是一个备用反馈，由于AI服务暂时不可用。

总体印象：
这是一个结构完整、人物塑造丰富的故事，具有扣人心弦的情节发展和深刻的主题探索。

情节评价：
- 故事的开端引人入胜，成功建立了读者的兴趣
- 中段情节发展紧凑，冲突设置合理
- 结局令人满意，既符合故事内部逻辑，又给读者留下了思考空间
- 建议：可以在关键转折点增加更多细节描写，增强戏剧性

人物塑造：
- 主角形象鲜明，性格特点突出
- 次要角色也有各自特色，不仅是情节推动工具
- 人物成长轨迹自然，具有说服力
- 建议：可以更深入探索角色内心矛盾，增加心理描写

主题探索：
- 故事主题明确，通过情节和角色互动自然展现
- 对核心议题的探讨深入而不说教
- 建议：可以更多元化地呈现不同观点，增加主题的层次感

写作风格：
- 语言流畅，叙事节奏把握得当
- 场景描写生动，能带给读者身临其境的感觉
- 建议：适当增加一些修辞手法和意象运用，丰富文学性

总结：这是一个极具潜力的作品，通过适当修改和精细打磨，能进一步提升整体质量和读者体验。
      `;

      return apiSuccess({
        result: fallbackFeedback,
        title: "故事总结与反馈 (备用)"
      });
    }
  }, 'AI总结反馈生成失败');
}
