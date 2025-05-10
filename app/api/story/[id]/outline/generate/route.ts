import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 获取故事ID
    const storyId = params.id;

    // 解析请求体
    const body = await request.json();
    const { prompt } = body;

    // 检查故事是否存在
    const story = await db.story.findUnique({
      where: {
        id: storyId,
      },
      include: {
        chapters: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: "故事不存在" },
        { status: 404 }
      );
    }

    // 构建系统提示
    const systemPrompt = `
      你是一个专业的小说大纲创作助手。
      你的任务是根据用户提供的故事信息，创建一个详细且结构化的故事大纲。
      大纲应该包含以下要素：
      1. 故事背景和设定
      2. 主要角色及其动机
      3. 故事主要情节（按时间顺序）
      4. 冲突和关键转折点
      5. 故事高潮
      6. 结局设想

      要求：
      - 大纲应保持结构清晰，使用段落、编号和项目符号增强可读性
      - 对于小说创作提供足够的指导，但保留创作自由度
      - 大纲应该是中文的，简洁有力
      - 总字数在800-1500字之间
    `;

    // 准备提示，包含已有的故事信息
    let userPrompt = prompt || `为小说"${story.title}"生成一个详细的故事大纲`;

    // 如果有故事内容，添加到提示中
    if (story.content) {
      userPrompt += `\n\n故事现有内容：\n${story.content.substring(0, 2000)}...`;
    }

    // 如果有章节，添加章节概要
    if (story.chapters && story.chapters.length > 0) {
      userPrompt += "\n\n已有章节：";
      story.chapters.forEach((chapter, index) => {
        userPrompt += `\n${index + 1}. ${chapter.title}: ${chapter.summary || chapter.content.substring(0, 100) + "..."
          }`;
      });
    }

    // 准备消息
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
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
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI服务错误: ${errorData.error?.message || response.statusText}`);
    }

    // 解析响应
    const data = await response.json();
    const generatedOutline = data.choices?.[0]?.message?.content || "";

    // 可选：将生成的大纲保存到数据库
    await db.story.update({
      where: {
        id: storyId,
      },
      data: {
        outline: generatedOutline,
      },
    });

    // 返回结果
    return NextResponse.json({ outline: generatedOutline });
  } catch (error) {
    console.error("生成故事大纲时出错:", error);

    return NextResponse.json(
      { error: "生成故事大纲失败" },
      { status: 500 }
    );
  }
}
