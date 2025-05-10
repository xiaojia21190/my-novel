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
 * 分析故事内容的一致性
 * POST /api/user/story/[id]/analyze-consistency
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
    const { content, checkType = 'all', chapterId = null } = body;

    if (!content) {
      return apiError('无效的请求数据', '请提供要分析的内容', 400);
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

    // 如果指定了章节ID，获取前后章节用于上下文
    let contextChapters = '';
    if (chapterId) {
      const chapterIndex = story.chapters.findIndex(ch => ch.id === chapterId);
      if (chapterIndex !== -1) {
        // 获取前一章节和后一章节（如果有）
        const prevChapter = chapterIndex > 0 ? story.chapters[chapterIndex - 1] : null;
        const nextChapter = chapterIndex < story.chapters.length - 1 ? story.chapters[chapterIndex + 1] : null;

        if (prevChapter) {
          contextChapters += `前一章节：${prevChapter.title}\n摘要：${prevChapter.summary || prevChapter.content.substring(0, 200) + '...'}\n\n`;
        }

        if (nextChapter) {
          contextChapters += `后一章节：${nextChapter.title}\n摘要：${nextChapter.summary || nextChapter.content.substring(0, 200) + '...'}\n\n`;
        }
      }
    }

    // 准备大纲信息（如果有）
    const outlineInfo = story.outline || '';

    // 根据检查类型设置提示
    let systemPrompt = '';
    if (checkType === 'character') {
      systemPrompt = `你是一位专业的文学编辑助手，专门分析小说中角色表现的一致性。请分析提供的内容，评估内容中的角色表现是否与其设定属性和特征保持一致。

请重点关注以下方面：
1. 角色行为是否符合其性格设定
2. 角色对话风格是否与其背景和特点相符
3. 角色决策是否符合其动机和目标
4. 角色关系互动是否合理
5. 角色情感反应是否自然

请以JSON格式返回分析结果：
{
  "consistency": true/false,
  "score": 1-10, // 一致性评分，10分为完全一致
  "issues": [
    {
      "character": "角色名",
      "issue": "不一致问题描述",
      "suggestion": "改进建议"
    }
  ],
  "strengths": ["优点1", "优点2"],
  "summary": "总体分析总结"
}`;
    } else if (checkType === 'plot') {
      systemPrompt = `你是一位专业的文学编辑助手，专门分析小说情节的连贯性和一致性。请分析提供的内容，评估情节发展是否合理，是否与故事大纲和已有内容保持一致。

请重点关注以下方面：
1. 情节逻辑性和连贯性
2. 与故事大纲的符合度
3. 与前后章节的衔接
4. 情节节奏和张力
5. 情节中可能存在的漏洞

请以JSON格式返回分析结果：
{
  "consistency": true/false,
  "score": 1-10, // 一致性评分，10分为完全一致
  "issues": [
    {
      "issue": "问题描述",
      "location": "问题位置",
      "suggestion": "改进建议"
    }
  ],
  "strengths": ["优点1", "优点2"],
  "summary": "总体分析总结"
}`;
    } else if (checkType === 'setting') {
      systemPrompt = `你是一位专业的文学编辑助手，专门分析小说世界设定的一致性。请分析提供的内容，评估是否与已建立的世界规则和设定保持一致。

请重点关注以下方面：
1. 空间和地点设定的一致性
2. 时间线和历史事件的连贯性
3. 世界规则和法则的遵循情况
4. 文化和社会背景的描述一致性
5. 专有名词和术语的使用一致性

请以JSON格式返回分析结果：
{
  "consistency": true/false,
  "score": 1-10, // 一致性评分，10分为完全一致
  "issues": [
    {
      "issue": "问题描述",
      "details": "详细说明",
      "suggestion": "改进建议"
    }
  ],
  "strengths": ["优点1", "优点2"],
  "summary": "总体分析总结"
}`;
    } else {
      // 全面分析
      systemPrompt = `你是一位专业的文学编辑助手，擅长分析小说内容的各方面一致性。请对提供的内容进行全面分析，评估其在角色、情节和世界设定三个维度的一致性。

请分析以下三个主要方面：
1. 角色一致性：角色行为、对话和情感是否与其设定相符
2. 情节一致性：情节发展是否合理，与大纲和前后章节的连贯性
3. 设定一致性：世界规则、环境描述和背景设定的一致性

请以JSON格式返回分析结果：
{
  "overallConsistency": true/false,
  "overallScore": 1-10,
  "character": {
    "consistency": true/false,
    "score": 1-10,
    "issues": [{"character": "角色名", "issue": "问题", "suggestion": "建议"}],
    "strengths": ["优点1", "优点2"]
  },
  "plot": {
    "consistency": true/false,
    "score": 1-10,
    "issues": [{"issue": "问题", "suggestion": "建议"}],
    "strengths": ["优点1", "优点2"]
  },
  "setting": {
    "consistency": true/false,
    "score": 1-10,
    "issues": [{"issue": "问题", "suggestion": "建议"}],
    "strengths": ["优点1", "优点2"]
  },
  "summary": "总体分析总结"
}`;
    }

    // 调用 AI 服务分析一致性
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
          {
            role: 'user',
            content: `请分析以下内容的一致性：

待分析内容：
${content}

${characterInfo ? `角色信息：\n${characterInfo}\n\n` : ''}
${outlineInfo ? `故事大纲：\n${outlineInfo}\n\n` : ''}
${contextChapters ? `相关章节上下文：\n${contextChapters}\n\n` : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('分析内容一致性失败:', response.statusText);
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
      return apiSuccess({
        message: '内容一致性分析完成',
        analysis: parsedResult,
        checkType
      });
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return apiError('解析分析结果失败', '服务器内部错误', 500);
    }
  }, '分析内容一致性失败');
}
