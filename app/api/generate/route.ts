import { NextResponse } from 'next/server';

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
        { role: 'system', content: '你是一个创意小说写作助手，请根据用户提供的小说内容，生成三个不同的、引人入胜的后续发展提示。每个提示应简短且能激发创作灵感，以列表形式（每项前加"-"）返回。提示应该富有想象力且引人入胜，展示不同的故事发展可能性。' },
        { role: 'user', content: `小说内容：${story}` },
      ];
    } else if (task === 'continue_story') {
      if (!prompt) {
        return NextResponse.json({ error: '任务类型为 continue_story 时，缺少 prompt 字段' }, { status: 400 });
      }
      messages = [
        { role: 'system', content: '你是一个创意小说写作助手，请根据用户提供的小说内容和选择的提示，继续撰写故事。请直接返回故事的下一部分内容，使用生动的描述和对话，以保持读者的兴趣。注意保持故事的连贯性和前后风格一致。' },
        { role: 'user', content: `小说内容：${story}\n\n提示：${prompt}` },
      ];
    } else {
      return NextResponse.json({ error: '无效的 task 类型' }, { status: 400 });
    }

    // 调用 OpenAI 兼容服务
    const openaiResponse = await fetch(process.env.OPENAI_API_BASE_URL || 'YOUR_DEFAULT_OPENAI_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17', // 或者使用您兼容服务支持的模型
        messages: messages,
        temperature: 0.8, // 略微提高以增加创造性
        max_tokens: 800, // 增加以获得更丰富的内容
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
          '主角决定探索未知领域，发现一个改变一切的秘密。',
          '一个神秘陌生人出现，带来意外的消息和机遇。',
          '突如其来的事件打破平静，迫使主角面对内心深处的恐惧。',
          '一个意外的发现揭示了过去被隐藏的真相。',
          '主角与对手之间的冲突达到高潮。',
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
      // 将生成的故事部分附加到现有故事后面
      output = responseContent.trim();
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
