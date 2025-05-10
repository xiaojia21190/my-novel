/**
 * AI 工具函数，用于生成文本
 */

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIRequestOptions = {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: string };
  timeoutMs?: number;     // 请求超时时间（毫秒）
  maxRetries?: number;    // 最大重试次数
  fallbackContent?: string | null; // 降级内容
  stream?: boolean;       // 是否使用流式响应
};

export enum AIErrorType {
  TIMEOUT = 'TIMEOUT',
  SERVICE_ERROR = 'SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN = 'UNKNOWN',
}

export class AIError extends Error {
  type: AIErrorType;
  retryable: boolean;
  details?: any;

  constructor(message: string, type: AIErrorType, retryable: boolean = false, details?: any) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.retryable = retryable;
    this.details = details;
  }
}

// 创建一个带超时的fetch请求
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 向 AI 模型发送请求，增强版，包含超时、重试和降级机制
 */
export async function generateAIResponse(messages: Message[], options?: AIRequestOptions) {
  const timeoutMs = options?.timeoutMs || 30000; // 默认30秒超时
  const maxRetries = options?.maxRetries || 2;   // 默认最多重试2次
  const temperature = options?.temperature || 0.3;
  const maxTokens = options?.maxTokens || 1000;
  const responseFormat = options?.responseFormat || { type: "text" };
  const stream = options?.stream || false;

  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const url = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions';

      // 构建请求体
      const requestBody = {
        model: process.env.AI_MODEL || 'gemini-2.5-flash-preview-04-17',
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: responseFormat,
        stream
      };

      // 使用带超时的fetch
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        },
        timeoutMs
      );

      // 处理错误响应
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const status = response.status;

        // 根据HTTP状态码分类错误
        if (status === 401 || status === 403) {
          throw new AIError(
            error.error?.message || '认证失败',
            AIErrorType.AUTHORIZATION_ERROR,
            false,
            error
          );
        } else if (status === 400) {
          throw new AIError(
            error.error?.message || '无效请求',
            AIErrorType.INVALID_REQUEST,
            false,
            error
          );
        } else if (status >= 500) {
          throw new AIError(
            error.error?.message || 'AI服务错误',
            AIErrorType.SERVICE_ERROR,
            true,  // 服务器错误可以重试
            error
          );
        } else {
          throw new AIError(
            error.error?.message || `HTTP错误: ${status}`,
            AIErrorType.UNKNOWN,
            status < 500, // 非5xx错误一般不重试
            error
          );
        }
      }

      return response;
    } catch (error: any) {
      // 处理不同类型的错误
      if (error.name === 'AbortError') {
        // 请求超时
        const aiError = new AIError(
          '请求超时',
          AIErrorType.TIMEOUT,
          true, // 超时可以重试
          { timeoutMs }
        );

        if (retries >= maxRetries) {
          // 如果有提供降级内容且已达到最大重试次数
          if (options?.fallbackContent !== undefined) {
            console.warn(`AI请求已达到最大重试次数(${maxRetries})，使用降级内容`);
            // 创建一个模拟的响应对象
            const fallbackResponse = new Response(
              options.fallbackContent !== null
                ? JSON.stringify({
                  choices: [{
                    message: {
                      content: options.fallbackContent
                    }
                  }]
                })
                : "",
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
            return fallbackResponse;
          }
          throw aiError;
        }
      } else if (error instanceof AIError) {
        // 如果已经是AIError类型，且不可重试或已达最大重试次数
        if (!error.retryable || retries >= maxRetries) {
          // 检查是否有降级内容
          if (options?.fallbackContent !== undefined && (error.type === AIErrorType.SERVICE_ERROR || error.type === AIErrorType.TIMEOUT)) {
            console.warn(`AI服务错误(${error.type})，使用降级内容`);
            const fallbackResponse = new Response(
              options.fallbackContent !== null
                ? JSON.stringify({
                  choices: [{
                    message: {
                      content: options.fallbackContent
                    }
                  }]
                })
                : "",
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
            return fallbackResponse;
          }
          throw error;
        }
      } else {
        // 其他错误（如网络错误）
        const aiError = new AIError(
          error.message || '未知错误',
          AIErrorType.NETWORK_ERROR,
          true, // 网络错误可以重试
          error
        );

        if (retries >= maxRetries) {
          // 检查是否有降级内容
          if (options?.fallbackContent !== undefined) {
            console.warn('网络错误，使用降级内容');
            const fallbackResponse = new Response(
              options.fallbackContent !== null
                ? JSON.stringify({
                  choices: [{
                    message: {
                      content: options.fallbackContent
                    }
                  }]
                })
                : "",
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
            return fallbackResponse;
          }
          throw aiError;
        }
      }

      // 准备重试
      retries++;
      console.warn(`AI请求失败，正在进行第${retries}次重试...`);
      // 简单的指数退避策略
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }

  // 这里不应该到达，添加以满足TypeScript
  throw new AIError(
    '到达了意外的代码路径',
    AIErrorType.UNKNOWN
  );
}

/**
 * 创建流式AI响应
 */
export async function generateStreamingAIResponse(messages: Message[], options?: AIRequestOptions) {
  // 确保流式处理标志开启
  const streamOptions = { ...options, stream: true };
  return generateAIResponse(messages, streamOptions);
}
