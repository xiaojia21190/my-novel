import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 清洗生成的内容，移除可能的提示词泄露或指令信息
 * @param content AI生成的原始内容
 * @returns 清洗后的内容
 */
function sanitizeGeneratedContent(content: string): string {
  if (!content) return '';

  // 移除可能的提示词泄露模式
  let sanitized = content
    // 移除"提示："或"提示:"开头的内容
    .replace(/^(提示[:：].*?)(?=\n|$)/gm, '')
    // 移除"小说内容："或"小说内容:"开头的内容
    .replace(/^(小说内容[:：].*?)(?=\n|$)/gm, '')
    // 移除AI可能生成的系统指令相关内容
    .replace(/^(作为一个创意小说写作助手|你是一个创意小说写作助手|我是一个创意小说写作助手).*?(?=\n|$)/gm, '')
    // 移除"继续撰写故事"等指令片段
    .replace(/^(继续撰写故事|请继续|下面是故事的下一部分)[:：]?/gm, '')
    // 移除markdown格式的提示（使用兼容的多行匹配方式）
    .replace(/```[\s\S]*?```/g, '')
    // 移除可能的角色扮演引导
    .replace(/^(下面我将|接下来我会|我会).*(?=\n|$)/gm, '')
    // 移除"好的，根据您提供的..."等常见引导语
    .replace(/^(好的|嗯|是的|没问题)，.*?(根据|基于|按照)(您|你|用户)(提供|给出)的.*?(提示|内容|故事).*?(我将|我会|下面|接下来)(继续|撰写|创作).*?[:：]?/i, '')
    // 移除更多变体的继续撰写故事引导语
    .replace(/^.{0,30}(继续撰写|续写|撰写|写)(故事|小说)的?(下一部分|接下来的部分)?[:：]?/i, '')
    // 移除生硬的故事开头指示
    .replace(/^故事(继续|开始|接下来)[:：]?/i, '')
    // 通用的删除包含"提示"和"内容"的整行
    .replace(/^.*?(提示|内容|故事|续写|生成)(的|地|了|是|：|:).*?[\n\r]/i, '');

  // 修复多余的空行问题，将连续的2个以上换行符替换为2个
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // 修剪首尾空白字符
  sanitized = sanitized.trim();

  // 确保不会截断句子
  if (sanitized.length > 0) {
    // 如果最后一个字符不是标点符号，并且不是完整句子结尾，添加省略号表示连续
    const lastChar = sanitized.charAt(sanitized.length - 1);
    const completeEndingPattern = /[。！？.!?]$/;
    if (!completeEndingPattern.test(lastChar)) {
      // 保持原样，不添加额外字符，因为这可能是中断的句子需要与下一段连接
    }

    // 如果首字符是小写字母或者是标点符号，可能是前一个句子的延续
    const firstChar = sanitized.charAt(0);
    const lowerCaseOrPunctuation = /^[a-z,，;；、]$/;
    if (lowerCaseOrPunctuation.test(firstChar)) {
      // 这是前一个句子的延续，保持原样
    }
  }

  return sanitized;
}

/**
 * 从故事中提取关键元素（角色、地点、情节点等）
 * @param content 故事内容
 * @returns 提取的关键元素
 */
async function extractKeyElements(content: string): Promise<Record<string, any>> {
  try {
    // 构建提取关键元素的系统提示
    const messages: Array<{ role: string, content: string }> = [
      {
        role: 'system',
        content: '你是一个小说分析助手，请从提供的故事内容中提取关键元素，包括：主要角色（及其特征）、故事发生的地点、重要的情节点、故事中的关键物品或概念、时间背景等。以JSON格式返回这些元素。'
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
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('提取关键元素失败:', response.statusText);
      return {};
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return {};
    }

    try {
      // 尝试解析JSON响应
      return JSON.parse(responseContent);
    } catch (e) {
      console.error('解析关键元素JSON失败:', e);
      // 提取结构化内容的备选方案
      const extractedData: {
        characters: string[];
        locations: string[];
        plotPoints: string[];
        keyItems: string[];
        temporalSetting: string;
      } = {
        characters: [],
        locations: [],
        plotPoints: [],
        keyItems: [],
        temporalSetting: ''
      };

      // 使用[\s\S]*模式替代s标志来匹配多行内容
      const characterMatch = responseContent.match(/角色[：:]\s*([\s\S]*?)(?=\n\n|\n[^\n]|$)/);
      if (characterMatch) extractedData.characters = characterMatch[1].split(/[,，、]/);

      const locationMatch = responseContent.match(/地点[：:]\s*([\s\S]*?)(?=\n\n|\n[^\n]|$)/);
      if (locationMatch) extractedData.locations = locationMatch[1].split(/[,，、]/);

      return extractedData;
    }
  } catch (error) {
    console.error('提取关键元素时出错:', error);
    return {};
  }
}

interface CoherenceAnalysis {
  coherent: boolean;
  issues: string[];
}

/**
 * 分析章节间连贯性
 * @param previousChapter 前一章节内容
 * @param currentChapter 当前章节内容
 * @returns 连贯性分析结果
 */
async function analyzeCoherence(previousChapter: string, currentChapter: string): Promise<CoherenceAnalysis> {
  try {
    // 构建分析连贯性的系统提示
    const messages: Array<{ role: string, content: string }> = [
      {
        role: 'system',
        content: '你是一个小说分析助手，负责评估两个连续章节之间的内容连贯性。请分析以下两个章节，并指出任何不连贯之处，包括人物描写不一致、情节发展冲突、设定矛盾等问题。以JSON格式返回分析结果。'
      },
      {
        role: 'user',
        content: `前一章节：${previousChapter}\n\n当前章节：${currentChapter}`
      }
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
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('分析连贯性失败:', response.statusText);
      return { coherent: true, issues: [] };
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      return { coherent: true, issues: [] };
    }

    try {
      // 尝试解析JSON响应
      return JSON.parse(responseContent);
    } catch (e) {
      console.error('解析连贯性分析JSON失败:', e);
      return { coherent: true, issues: [] };
    }
  } catch (error) {
    console.error('分析连贯性时出错:', error);
    return { coherent: true, issues: [] };
  }
}

/**
 * 生成具有连贯性的章节内容
 * @param storyId 故事ID
 * @param previousChapterContent 前一章节内容
 * @param previousChapterSummary 前一章节摘要
 * @param chapterPrompt 章节提示
 * @returns 生成的章节内容
 */
async function generateCoherentChapter(storyId: string, previousChapterContent: string, previousChapterSummary: string, chapterPrompt: string): Promise<string> {
  try {
    // 获取故事信息
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      throw new Error('故事不存在');
    }

    // 获取故事中的角色
    const characters = await prisma.character.findMany({
      where: { storyId }
    });

    // 提取故事设定
    const worldSetting = story.worldSetting || '';
    const storySummary = story.summary || '';

    // 构建增强的角色信息
    let characterInfo = '';
    if (characters.length > 0) {
      characterInfo = characters.map(char => {
        let charInfo = `${char.name}: ${char.description || ''}`;

        // 如果有属性数据，解析并格式化
        if (char.attributes) {
          try {
            const attrs = JSON.parse(char.attributes as string);
            if (attrs) {
              // 添加格式化的属性信息
              const attrLines = [];
              if (attrs.appearance) attrLines.push(`  外表: ${attrs.appearance}`);
              if (attrs.personality) attrLines.push(`  性格: ${attrs.personality}`);
              if (attrs.background) attrLines.push(`  背景: ${attrs.background}`);
              if (attrs.goals) attrLines.push(`  目标: ${attrs.goals}`);
              if (attrs.relationships) attrLines.push(`  关系: ${attrs.relationships}`);

              // 添加其他自定义属性
              Object.entries(attrs).forEach(([key, value]) => {
                if (!['appearance', 'personality', 'background', 'goals', 'relationships'].includes(key)) {
                  attrLines.push(`  ${key}: ${value}`);
                }
              });

              if (attrLines.length > 0) {
                charInfo += '\n' + attrLines.join('\n');
              }
            }
          } catch (e) {
            console.warn(`解析角色 ${char.name} 的属性时出错:`, e);
          }
        }

        return charInfo;
      }).join('\n\n');
    } else {
      characterInfo = '故事中暂无定义的角色';
    }

    // 构建系统提示
    const systemPrompt = `你是一个创意小说写作专家，擅长创作连贯、引人入胜的故事。请根据以下信息创作新的章节内容：

故事背景：
${worldSetting}

故事摘要：
${storySummary}

主要角色（包括详细属性）：
${characterInfo}

前一章节内容：
${previousChapterContent}

前一章节摘要：
${previousChapterSummary}

新章节提示：
${chapterPrompt}

请特别注意:
1. 确保新章节与前一章节内容自然衔接，保持人物、环境、情节的一致性
2. 严格遵循角色属性和特征，不要改变角色的基本设定
3. 章节内容应推动情节向前发展，同时保持与整体故事设定的协调
4. 对话和行为应反映角色的特性和背景
5. 如果角色不多，可以更深入地描绘现有角色的内心世界和发展

请直接返回章节内容，不要添加额外的说明或标记。`;

    // 调用 OpenAI 兼容服务
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
          { role: 'user', content: '请开始创作新章节内容' }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('生成连贯章节失败:', response.statusText);
      throw new Error('生成连贯章节失败');
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error('生成的内容为空');
    }

    return sanitizeGeneratedContent(responseContent);
  } catch (error) {
    console.error('生成连贯章节时出错:', error);
    throw error;
  }
}

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

export async function POST(req: Request) {
  try {
    const { story, prompt, task, storyId, previousChapterId, checkCharacterConsistency } = await req.json();

    if (!task) {
      return NextResponse.json({ error: '请求体中缺少 task 字段' }, { status: 400 });
    }

    let messages: Array<{ role: string, content: string }> = [];
    let output;

    // 构建发送给 OpenAI 兼容服务的 messages 数组
    if (task === 'generate_prompts') {
      if (!story) {
        return NextResponse.json({ error: '请求体中缺少 story 字段' }, { status: 400 });
      }

      messages = [
        { role: 'system', content: '你是一个创意小说写作助手，请根据用户提供的小说内容，生成三个不同的、引人入胜的后续发展提示。每个提示应当包含足够的细节且能激发创作灵感，以列表形式（每项前加"-"）返回。提示应该富有想象力且引人入胜，展示不同的故事发展可能性。确保每个提示至少包含40-60个字的详细描述。' },
        { role: 'user', content: `小说内容：${story}` },
      ];
    } else if (task === 'continue_story') {
      if (!story || !prompt) {
        return NextResponse.json({ error: '请求体中缺少 story 或 prompt 字段' }, { status: 400 });
      }

      // 从故事中提取关键元素
      const keyElements = await extractKeyElements(story);
      const keyElementsJson = JSON.stringify(keyElements);

      // 如果有storyId，获取已存在的角色信息
      let characterInfo = '';
      if (storyId && checkCharacterConsistency) {
        try {
          const characters = await prisma.character.findMany({
            where: { storyId }
          });

          if (characters && characters.length > 0) {
            const characterDetails = characters.map(char => {
              let charInfo = `${char.name}: ${char.description || ''}`;

              // 添加属性信息（如果有）
              if (char.attributes) {
                try {
                  const attrs = JSON.parse(char.attributes as string);
                  if (attrs) {
                    const attrLines = [];
                    if (attrs.appearance) attrLines.push(`外表: ${attrs.appearance}`);
                    if (attrs.personality) attrLines.push(`性格: ${attrs.personality}`);
                    if (attrs.background) attrLines.push(`背景: ${attrs.background}`);

                    if (attrLines.length > 0) {
                      charInfo += `\n  ${attrLines.join(', ')}`;
                    }
                  }
                } catch (e) {
                  console.warn(`解析角色属性时出错:`, e);
                }
              }

              return charInfo;
            }).join('\n');

            characterInfo = `\n\n注意以下是故事中的已设定角色，请确保你生成的内容与这些角色设定保持一致：\n${characterDetails}`;
          }
        } catch (error) {
          console.warn('获取角色信息失败:', error);
          // 忽略错误，继续生成，只是没有角色信息
        }
      }

      messages = [
        { role: 'system', content: `你是一个创意小说写作助手。请根据用户提供的故事内容和选定的发展提示，继续撰写这个故事的下一部分。请确保新内容与已有内容在风格、人物塑造和情节上保持一致连贯。以下是从故事中提取的关键元素，请参考以保持一致性：${keyElementsJson}${characterInfo}` },
        { role: 'user', content: `故事现有内容：${story}\n\n选定的发展提示：${prompt}\n\n请继续撰写故事的下一部分，字数在500-800字之间，保持与已有内容的风格一致。` },
      ];
    } else if (task === 'generate_coherent_chapter') {
      if (!storyId || !previousChapterId || !prompt) {
        return NextResponse.json({ error: '请求体中缺少必要字段' }, { status: 400 });
      }

      try {
        // 获取前一章节内容
        const previousChapter = await prisma.chapter.findUnique({
          where: { id: previousChapterId }
        });

        if (!previousChapter) {
          return NextResponse.json({ error: '前一章节不存在' }, { status: 404 });
        }

        // 生成连贯章节内容
        const chapterContent = await generateCoherentChapter(
          storyId,
          previousChapter.content,
          previousChapter.summary || '',
          prompt
        );

        return NextResponse.json({
          content: chapterContent,
          success: true
        });
      } catch (error) {
        console.error('生成连贯章节失败:', error);
        return NextResponse.json({
          error: '生成连贯章节失败',
          details: error instanceof Error ? error.message : '未知错误',
          success: false
        }, { status: 500 });
      }
    } else if (task === 'analyze_coherence') {
      if (!story || !prompt) {
        return NextResponse.json({ error: '请求体中缺少前一章节或当前章节内容' }, { status: 400 });
      }

      try {
        // 分析章节间连贯性
        const coherenceAnalysis = await analyzeCoherence(story, prompt);

        return NextResponse.json({
          analysis: coherenceAnalysis,
          success: true
        });
      } catch (error) {
        console.error('分析连贯性失败:', error);
        return NextResponse.json({
          error: '分析连贯性失败',
          details: error instanceof Error ? error.message : '未知错误',
          success: false
        }, { status: 500 });
      }
    } else if (task === 'check_character_consistency') {
      if (!storyId || !prompt) {
        return NextResponse.json({ error: '请求体中缺少故事ID或内容' }, { status: 400 });
      }

      try {
        // 获取故事的角色
        const characters = await prisma.character.findMany({
          where: { storyId }
        });

        if (!characters || characters.length === 0) {
          return NextResponse.json({
            consistent: true,
            message: '故事中没有定义角色，无需检查一致性',
            success: true
          });
        }

        // 构建角色信息
        const characterInfo = characters.map(char => {
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

        // 调用 OpenAI 兼容服务检查一致性
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
                content: `你是一个小说分析助手，负责评估内容与已有角色设定的一致性。请根据以下角色信息，分析提供的内容是否与角色设定相符，并指出任何不一致之处：

角色设定：
${characterInfo}

请分析内容并以JSON格式返回结果：
{
  "consistent": true/false,
  "issues": [
    {
      "character": "角色名",
      "description": "不一致描述",
      "suggestion": "修正建议"
    }
  ],
  "summary": "简要总结分析结果"
}`
              },
              { role: 'user', content: `待分析内容：${prompt}` }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          return NextResponse.json({
            error: '角色一致性检查失败',
            details: response.statusText,
            success: false
          }, { status: 500 });
        }

        const data = await response.json();
        const analysisResult = data.choices?.[0]?.message?.content;

        if (!analysisResult) {
          return NextResponse.json({
            error: '角色一致性检查失败',
            details: 'AI返回的内容为空',
            success: false
          }, { status: 500 });
        }

        try {
          const parsedResult = JSON.parse(analysisResult);
          return NextResponse.json({
            ...parsedResult,
            success: true
          });
        } catch (e) {
          return NextResponse.json({
            error: '解析角色一致性结果失败',
            details: e instanceof Error ? e.message : '未知错误',
            success: false
          }, { status: 500 });
        }
      } catch (error) {
        console.error('角色一致性检查失败:', error);
        return NextResponse.json({
          error: '角色一致性检查失败',
          details: error instanceof Error ? error.message : '未知错误',
          success: false
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: '无效的任务类型' }, { status: 400 });
    }

    // 调用 OpenAI 兼容服务
    const openaiResponse = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API 错误:', openaiResponse.statusText);
      return NextResponse.json({ error: 'AI 服务错误', details: openaiResponse.statusText }, { status: 500 });
    }

    const openaiData = await openaiResponse.json();
    const responseContent = openaiData.choices?.[0]?.message?.content;

    if (typeof responseContent !== 'string') {
      console.error('AI API 响应格式错误:', openaiData);
      return NextResponse.json({ error: 'AI 服务响应格式错误' }, { status: 500 });
    }

    if (task === 'generate_prompts') {
      // 解析为数组
      output = responseContent
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^- /, '').trim())
        .slice(0, 3);

      // 如果解析失败或提示数量不足，提供备用 prompts
      if (output.length < 3) {
        const backupPrompts = [
          '主角决定探索未知领域，发现一个改变一切的秘密，这个发现将彻底颠覆他们的世界观。',
          '一个神秘陌生人出现，带来意外的消息和机遇，却也伴随着不可预见的危险和考验。',
          '突如其来的事件打破平静，迫使主角面对内心深处的恐惧，并重新思考自己的人生目标和价值观。',
          '一个意外的发现揭示了过去被隐藏的真相，让主角开始质疑自己所知道的一切和信任的人。',
          '主角与对手之间的冲突达到高潮，迫使双方在关键时刻做出可能改变一切的决定和牺牲。',
          '主角遇到人生中的重要抉择，每一条路都有诱人的前景，但也隐藏着各自的风险和代价。',
          '一次意外的旅程将主角带到陌生的环境，在那里他们遇到了改变人生轨迹的关键人物和事件。',
        ];

        // 填充缺少的提示
        while (output.length < 3) {
          const randomIndex = Math.floor(Math.random() * backupPrompts.length);
          const backupPrompt = backupPrompts[randomIndex];
          if (!output.includes(backupPrompt)) {
            output.push(backupPrompt);
            backupPrompts.splice(randomIndex, 1);
          }
        }
      }

      return NextResponse.json({ prompts: output });
    } else if (task === 'continue_story') {
      output = sanitizeGeneratedContent(responseContent);
      return NextResponse.json({ story: output });
    } else {
      return NextResponse.json({ error: '未知任务类型' }, { status: 400 });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return NextResponse.json({ error: '服务器内部错误', details: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}
