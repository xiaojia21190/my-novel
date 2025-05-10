import { NextResponse } from "next/server";
import { generateAIResponse, Message } from "@/lib/ai-utils";
import { createErrorResponse } from "@/lib/error-utils";

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少必要的提示参数" },
        { status: 400 }
      );
    }

    // 构建系统提示
    const systemPrompt = `
      你是一个专业的小说角色创作助手。
      你的任务是根据用户的简短描述，创建一个详细且生动的角色描述。
      角色描述应该全面但精炼，包括外貌、性格特点、背景故事和动机。
      描述应该是中文的，有文学性但不过于华丽，约300-500字左右。
      不要使用过于模板化的语言，每个角色应该有其独特性。
    `;

    // 准备消息
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];

    // 调用增强版的AI服务，包含超时和重试机制
    const response = await generateAIResponse(messages, {
      temperature: 0.8,
      maxTokens: 1000,
      timeoutMs: 20000, // 20秒超时
      maxRetries: 2,    // 最多重试2次
      // 提供一个简单的降级内容，在完全失败时使用
      fallbackContent: `这是一个临时生成的角色描述，因为AI服务暂时不可用。

      名称：${prompt.includes(':') ? prompt.split(':')[0] : '未命名角色'}

      基本描述：一个神秘的角色，具有独特的背景和特点。这个角色有着鲜明的性格特点和引人入胜的故事背景。

      请稍后再尝试使用AI生成更详细的描述。`
    });

    // 解析响应
    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || "";

    // 返回结果
    return NextResponse.json({ description });
  } catch (error) {
    // 使用标准化的错误处理
    return createErrorResponse(error, "生成角色描述失败");
  }
}
