import { NextResponse } from 'next/server';

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

export async function POST(req: Request) {
  try {
    const { story, prompt, task } = await req.json();

    if (!story || !task) {
      return NextResponse.json({ error: '请求体中缺少 story 或 task 字段' }, { status: 400 });
    }

    let messages = [];
    let output;

    // 构建发送给 OpenAI 兼容服务的 messages 数组
    if (task === 'generate_prompts') {
      messages = [
        { role: 'system', content: '你是一个创意小说写作助手，请根据用户提供的小说内容，生成三个不同的、引人入胜的后续发展提示。每个提示应当包含足够的细节且能激发创作灵感，以列表形式（每项前加"-"）返回。提示应该富有想象力且引人入胜，展示不同的故事发展可能性。确保每个提示至少包含40-60个字的详细描述。' },
        { role: 'user', content: `小说内容：${story}` },
      ];
    } else if (task === 'continue_story') {
      if (!prompt) {
        return NextResponse.json({ error: '任务类型为 continue_story 时，缺少 prompt 字段' }, { status: 400 });
      }
      messages = [
        { role: 'system', content: '你是一个创意小说写作助手，请根据用户提供的小说内容和选择的提示，继续撰写故事。请直接返回故事的下一部分内容，不要包含任何引导语、解释或前缀（如"好的"、"继续撰写故事"等）。生成至少1500字的篇幅，使用生动的描述、细节丰富的场景和深入的对话，以保持读者的兴趣。故事内容应当丰富而有深度，包含情节发展、人物刻画和环境描写。你的核心任务是保证故事的绝对连贯性和风格一致性。**必须确保**新生成的内容从前文的最后一个词或标点符号开始**无缝衔接**，如同出自一人之手，不允许任何断裂感或突兀的开始。叙述风格、语气和人物状态必须与前文保持高度一致。**所有生成的内容都应使用简体中文**，除非故事背景或角色设定明确需要使用其他语言（例如特定角色的英文对话）。重要提示：直接从故事内容开始，不要包含任何形式的引导语或提示。' },
        { role: 'user', content: `小说内容：${story}\n\n提示：${prompt}\n\n请直接生成故事内容，不要添加任何解释或引导语。**务必确保**从前文的最后一个词或句子**无缝、自然地衔接**，保持故事的绝对流畅与连贯。` },
      ];
    } else {
      return NextResponse.json({ error: '无效的 task 类型' }, { status: 400 });
    }

    // 调用 OpenAI 兼容服务
    const openaiResponse = await fetch(process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17', // 或者使用您兼容服务支持的模型
        messages: messages,
        temperature: 0.7, // 调整温度，平衡创造性和指令遵循性
        max_tokens: 2000, // 增加以获得更丰富的内容
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorBody);
      return NextResponse.json({
        error: `调用 AI 服务失败`,
        details: `${openaiResponse.statusText}`,
        status: openaiResponse.status
      }, { status: openaiResponse.status });
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

      return NextResponse.json({
        prompts: output,
        success: true
      });

    } else if (task === 'continue_story') {
      // 将生成的故事部分附加到现有故事后面，应用清洗函数处理内容
      output = sanitizeGeneratedContent(responseContent.trim());
      return NextResponse.json({
        story: output,
        success: true
      });
    } else {
      // 理论上不会走到这里
      return NextResponse.json({ error: '无效的任务类型' }, { status: 400 });
    }

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({
      error: '生成内容失败',
      details: error instanceof Error ? error.message : '未知错误',
      success: false
    }, { status: 500 });
  }
}
