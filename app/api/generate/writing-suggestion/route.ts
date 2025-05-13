import { generateStreamingAIResponse, Message, AIRequestOptions, convertToStreamResponse } from "@/lib/ai-utils";
import { createErrorResponse } from "@/lib/error-utils";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = "edge";

// 设置写作相关提示的缓存TTL（2小时）
const WRITING_SUGGESTION_CACHE_TTL = 2 * 60 * 60 * 1000;

// 定义流式响应工具
async function* streamToAsyncIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

// 根据URL区分是正常请求还是恢复请求
export async function POST(req: Request) {
  // 检查URL是否为恢复请求
  if (req.url.endsWith('/resume')) {
    return handleResumeRequest(req);
  } else {
    return handleNormalRequest(req);
  }
}

// 处理正常的写作建议请求
async function handleNormalRequest(req: Request) {
  const user = await currentUser();

  // 确保用户已登录
  if (!user) {
    return new Response("未授权访问", { status: 401 });
  }

  try {
    const { prompt, partialResult, priority } = await req.json();

    if (!prompt) {
      return new Response("缺少必要参数", { status: 400 });
    }

    const systemMessage = "你是一位专业的写作辅助工具，专门为小说作者提供高质量的文本建议，以提升他们的写作。你的回复应该简洁、有用，并且可以直接应用到他们的作品中。避免任何额外的解释或元评论。";

    // 构建消息，如果有部分结果则附加
    const messages: Message[] = [
      {
        role: 'system',
        content: systemMessage
      }
    ];

    // 如果有部分结果，添加用户之前的提示和AI的部分回复
    if (partialResult) {
      messages.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: partialResult }
      );
      // 添加提示继续完成
      messages.push({ role: 'user', content: "请继续完成你的回答" });
    } else {
      // 常规提示
      messages.push({ role: 'user', content: prompt });
    }

    // 配置AI请求选项 - 启用缓存机制
    const options: AIRequestOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      stream: true,
      timeoutMs: 40000, // 流式响应给予更长的超时时间
      maxRetries: 1,    // 流式响应通常只需要较少的重试
      fallbackContent: "很抱歉，我暂时无法提供写作建议。请稍后再试或考虑以下一般性建议：\n\n- 注重人物情感描写\n- 保持情节连贯性\n- 避免过多修饰词\n- 考虑读者视角",
      enableCache: !partialResult, // 只有完整请求才缓存，继续生成的部分不缓存
      cacheTtl: WRITING_SUGGESTION_CACHE_TTL,
      priority: priority || 'balanced' // 使用请求指定的优先级或默认为平衡
    };

    // 发送流式请求
    const response = await generateStreamingAIResponse(messages, options);

    // 使用X-From-Cache头检测是否命中缓存
    const isFromCache = response.headers.get('X-From-Cache') === 'true';

    // 检查是否需要流式响应
    const needsStream = req.headers.get('Accept') === 'text/event-stream';

    // 对缓存的响应特殊处理
    if (isFromCache) {
      try {
        // 从缓存响应中解析数据
        const cachedData = await response.json();
        const content = cachedData.choices?.[0]?.message?.content || '';

        // 如果客户端请求流式响应，但我们有缓存的完整响应，则模拟流式传输
        if (needsStream) {
          const stream = convertToStreamResponse(content, 20, 10);

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
              'X-Response-Time': response.headers.get('X-Response-Time') || '',
              'X-Model-Used': cachedData.model || 'unknown',
              'X-From-Cache': 'true'
            }
          });
        } else {
          // 如果客户端不需要流式响应，直接返回缓存的完整响应
          return new Response(JSON.stringify({ content }), {
            headers: {
              'Content-Type': 'application/json',
              'X-Response-Time': response.headers.get('X-Response-Time') || '',
              'X-Model-Used': cachedData.model || 'unknown',
              'X-From-Cache': 'true'
            }
          });
        }
      } catch (e) {
        console.error("处理缓存响应时出错:", e);
        // 如果解析失败，回退到原始响应
        return new Response(response.body, {
          headers: response.headers
        });
      }
    }

    // 添加性能和缓存相关的响应头
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // 复制所有响应头
    for (const [key, value] of response.headers.entries()) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    // 非缓存的流式响应直接返回
    return new Response(response.body, { headers });
  } catch (error) {
    console.error("AI 写作建议生成失败:", error);
    return createErrorResponse(error, "生成建议时出错");
  }
}

// 处理从中断恢复的请求
async function handleResumeRequest(req: Request) {
  const user = await currentUser();

  // 确保用户已登录
  if (!user) {
    return new Response("未授权访问", { status: 401 });
  }

  try {
    const { prompt, partialResult, priority } = await req.json();

    if (!prompt || !partialResult) {
      return new Response("缺少必要参数", { status: 400 });
    }

    // 针对恢复请求的特殊处理
    // 这里我们使用非流式响应，直接返回建议的完成部分
    const systemMessage = "你是一位专业的写作辅助工具。你需要继续完成之前被中断的回复。请直接继续，不要重复已有内容，也不要提及中断。";

    const messages: Message[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
      { role: 'assistant', content: partialResult },
      { role: 'user', content: "请继续完成你的回答，从上面已有文本的末尾继续" }
    ];

    const options: AIRequestOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      stream: false,  // 恢复请求使用非流式响应
      timeoutMs: 20000,
      fallbackContent: "无法继续生成内容。请尝试重新开始。",
      priority: priority || 'quality' // 恢复请求优先使用质量优先
    };

    const response = await generateStreamingAIResponse(messages, options);
    const data = await response.json();
    const completion = data.choices?.[0]?.message?.content || "";

    // 添加性能指标
    const headers = new Headers({
      'Content-Type': 'application/json'
    });

    // 复制所有响应头
    for (const [key, value] of response.headers.entries()) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    return new Response(JSON.stringify({ completion }), { headers });
  } catch (error) {
    console.error("恢复AI写作建议失败:", error);
    return createErrorResponse(error, "恢复生成建议时出错");
  }
}
