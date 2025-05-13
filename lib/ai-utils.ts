/**
 * AI 工具函数，用于生成文本
 */

import { aiResponseCache } from "./ai-cache-service";

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
  enableCache?: boolean;  // 是否启用缓存（默认为true）
  cacheTtl?: number;      // 缓存生存时间（毫秒）
  forceModel?: string;    // 强制使用特定模型
  priority?: 'speed' | 'quality' | 'balanced'; // 请求优先级
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

// 请求性能指标记录
const requestMetrics = {
  totalRequests: 0,
  cachedResponses: 0,
  streamedRequests: 0,
  averageResponseTime: 0,
  requestsPerModel: {} as Record<string, number>,
  errors: {} as Record<string, number>,
  recordRequest: function (model: string, cached: boolean, streaming: boolean, responseTime: number) {
    this.totalRequests++;
    if (cached) this.cachedResponses++;
    if (streaming) this.streamedRequests++;

    // 更新模型使用计数
    this.requestsPerModel[model] = (this.requestsPerModel[model] || 0) + 1;

    // 更新平均响应时间
    this.averageResponseTime =
      (this.averageResponseTime * (this.totalRequests - 1) + responseTime) / this.totalRequests;
  },
  recordError: function (errorType: string) {
    this.errors[errorType] = (this.errors[errorType] || 0) + 1;
  },
  getStats: function () {
    return {
      ...this,
      recordRequest: undefined,
      recordError: undefined,
      getStats: undefined
    };
  }
};

/**
 * 向 AI 模型发送请求，增强版，包含超时、重试、缓存和降级机制
 */
export async function generateAIResponse(messages: Message[], options?: AIRequestOptions) {
  const timeoutMs = options?.timeoutMs || 30000; // 默认30秒超时
  const maxRetries = options?.maxRetries || 2;   // 默认最多重试2次
  const temperature = options?.temperature || 0.3;
  const maxTokens = options?.maxTokens || 1000;
  const responseFormat = options?.responseFormat || { type: "text" };
  const stream = options?.stream || false;
  const enableCache = options?.enableCache !== false; // 默认启用缓存
  const startTime = Date.now();

  // 预处理消息以提高一致性
  const processedMessages = preprocessMessages(messages);

  // 非流式请求且启用缓存时，尝试从缓存获取响应
  if (enableCache && !stream && aiResponseCache.isCacheable(processedMessages, options)) {
    const cachedResponse = aiResponseCache.get(processedMessages, options);
    if (cachedResponse) {
      console.log('使用缓存的AI响应');

      // 记录性能指标
      const responseTime = Date.now() - startTime;
      requestMetrics.recordRequest(
        cachedResponse.model || 'cached',
        true,
        false,
        responseTime
      );

      // 创建一个模拟的响应对象
      return new Response(
        JSON.stringify(cachedResponse),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-From-Cache': 'true',
            'X-Response-Time': responseTime.toString()
          }
        }
      );
    }
  }

  let retries = 0;
  let lastError: AIError | null = null;

  while (retries <= maxRetries) {
    try {
      const url = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions';

      // 动态选择最合适的模型
      const modelName = options?.forceModel || selectOptimalModel(processedMessages, options);

      // 构建请求体
      const requestBody = {
        model: modelName,
        messages: processedMessages,
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
        let errorType: AIErrorType;
        let retryable = false;

        if (status === 401 || status === 403) {
          errorType = AIErrorType.AUTHORIZATION_ERROR;
        } else if (status === 400) {
          errorType = AIErrorType.INVALID_REQUEST;
        } else if (status >= 500) {
          errorType = AIErrorType.SERVICE_ERROR;
          retryable = true;  // 服务器错误可以重试
        } else {
          errorType = AIErrorType.UNKNOWN;
          retryable = status < 500; // 非5xx错误一般不重试
        }

        const aiError = new AIError(
          error.error?.message || `HTTP错误: ${status}`,
          errorType,
          retryable,
          error
        );

        // 记录错误指标
        requestMetrics.recordError(errorType);

        // 保存最后的错误
        lastError = aiError;

        throw aiError;
      }

      // 计算响应时间
      const responseTime = Date.now() - startTime;

      // 记录性能指标
      requestMetrics.recordRequest(
        modelName,
        false,
        stream,
        responseTime
      );

      // 对于非流式请求，尝试缓存响应
      if (enableCache && !stream && aiResponseCache.isCacheable(processedMessages, options)) {
        // 克隆响应，因为响应流只能被读取一次
        const clonedResponse = response.clone();
        // 解析响应内容
        try {
          const responseData = await clonedResponse.json();
          // 添加使用的模型信息到缓存数据
          responseData.model = modelName;
          // 存储到缓存
          aiResponseCache.set(processedMessages, options, responseData, options?.cacheTtl);
        } catch (e) {
          console.warn('缓存响应失败:', e);
        }
      }

      // 添加响应时间头
      const headers = new Headers(response.headers);
      headers.set('X-Response-Time', responseTime.toString());
      headers.set('X-Model-Used', modelName);

      // 创建新的响应以添加性能指标头
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
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

        // 记录错误指标
        requestMetrics.recordError(AIErrorType.TIMEOUT);

        // 保存最后的错误
        lastError = aiError;

        if (retries >= maxRetries) {
          // 如果有提供降级内容且已达到最大重试次数
          if (options?.fallbackContent !== undefined) {
            console.warn(`AI请求已达到最大重试次数(${maxRetries})，使用降级内容`);
            return createFallbackResponse(options.fallbackContent, startTime);
          }
          throw aiError;
        }
      } else if (error instanceof AIError) {
        // 如果已经是AIError类型，且不可重试或已达最大重试次数
        if (!error.retryable || retries >= maxRetries) {
          // 检查是否有降级内容
          if (options?.fallbackContent !== undefined &&
            (error.type === AIErrorType.SERVICE_ERROR || error.type === AIErrorType.TIMEOUT)) {
            console.warn(`AI服务错误(${error.type})，使用降级内容`);
            return createFallbackResponse(options.fallbackContent, startTime);
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

        // 记录错误指标
        requestMetrics.recordError(AIErrorType.NETWORK_ERROR);

        // 保存最后的错误
        lastError = aiError;

        if (retries >= maxRetries) {
          // 检查是否有降级内容
          if (options?.fallbackContent !== undefined) {
            console.warn('网络错误，使用降级内容');
            return createFallbackResponse(options.fallbackContent, startTime);
          }
          throw aiError;
        }
      }

      // 准备重试
      retries++;

      // 退避时间增加
      const backoffTime = Math.min(1000 * Math.pow(2, retries - 1), 8000); // 最多8秒
      console.warn(`AI请求失败，正在进行第${retries}次重试...在 ${backoffTime}ms 后`);

      // 指数退避策略
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }

  // 这里不应该到达，抛出最后捕获的错误，或创建一个新错误
  if (lastError) {
    throw lastError;
  } else {
    throw new AIError(
      '到达了意外的代码路径',
      AIErrorType.UNKNOWN
    );
  }
}

/**
 * 创建流式AI响应
 */
export async function generateStreamingAIResponse(messages: Message[], options?: AIRequestOptions) {
  // 确保流式处理标志开启
  const streamOptions = { ...options, stream: true };
  return generateAIResponse(messages, streamOptions);
}

/**
 * 创建降级响应
 */
function createFallbackResponse(fallbackContent: string | null, startTime: number): Response {
  const responseTime = Date.now() - startTime;

  return new Response(
    fallbackContent !== null
      ? JSON.stringify({
        choices: [{
          message: {
            content: fallbackContent
          }
        }]
      })
      : "",
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': responseTime.toString(),
        'X-Fallback': 'true'
      }
    }
  );
}

/**
 * 预处理消息，提高一致性和性能
 */
function preprocessMessages(messages: Message[]): Message[] {
  return messages.map(msg => {
    // 对系统消息不做处理
    if (msg.role === 'system') return msg;

    // 对用户和助手消息进行处理
    return {
      ...msg,
      content: msg.content
        .trim()
        .replace(/\s+/g, ' ') // 规范化空白字符
    };
  });
}

/**
 * 动态选择最合适的语言模型
 * 基于请求内容长度和复杂度选择合适的模型
 */
function selectOptimalModel(messages: Message[], options?: AIRequestOptions): string {
  // 默认使用配置的模型或gemini-2.5-flash
  const configuredModel = process.env.AI_MODEL || 'gemini-2.5-flash-preview-04-17';

  // 强制使用特定优先级
  if (options?.priority === 'speed') {
    return process.env.FAST_AI_MODEL || 'gemini-2.5-flash-preview-04-17';
  } else if (options?.priority === 'quality') {
    return process.env.POWERFUL_AI_MODEL || 'gemini-2.5-pro-preview-04-17';
  }

  // 检查是否开启了自动模型选择
  if (process.env.ENABLE_AUTO_MODEL_SELECTION !== 'true') {
    return configuredModel;
  }

  // 计算消息内容总长度和复杂度
  const metrics = analyzeContentComplexity(messages);

  // 如果内容很短且简单，使用更快的模型
  if (metrics.totalLength < 1500 &&
    metrics.complexityScore < 0.3 &&
    (!options?.maxTokens || options.maxTokens < 500)) {
    return process.env.FAST_AI_MODEL || 'gemini-2.5-flash-preview-04-17';
  }

  // 如果内容很长或复杂，使用更强大的模型
  if (metrics.totalLength > 10000 ||
    metrics.complexityScore > 0.7 ||
    (options?.maxTokens && options.maxTokens > 2000)) {
    return process.env.POWERFUL_AI_MODEL || 'gemini-2.5-pro-preview-04-17';
  }

  // 默认返回配置的模型
  return configuredModel;
}

/**
 * 分析内容复杂度
 */
function analyzeContentComplexity(messages: Message[]): { totalLength: number; complexityScore: number } {
  let totalLength = 0;
  let complexityScore = 0;

  // 复杂度指标
  let longWordCount = 0;
  let specialCharCount = 0;
  let lineBreakCount = 0;
  let codeBlockCount = 0;

  for (const msg of messages) {
    const content = msg.content;
    totalLength += content.length;

    // 计算长单词比例 (长于8个字符)
    const words = content.split(/\s+/);
    longWordCount += words.filter(w => w.length > 8).length;

    // 特殊字符计数
    specialCharCount += (content.match(/[^\w\s]/g) || []).length;

    // 换行符计数 (可能表示结构复杂度)
    lineBreakCount += (content.match(/\n/g) || []).length;

    // 代码块计数 (表示技术内容)
    codeBlockCount += (content.match(/```/g) || []).length / 2;
  }

  // 样本量太小时降低复杂度评分
  if (totalLength < 50) {
    return { totalLength, complexityScore: 0.1 };
  }

  // 计算复杂度得分 (0-1)
  const wordsCount = Math.max(1, totalLength / 5); // 估算词数

  complexityScore = Math.min(1, Math.max(0,
    (longWordCount / wordsCount) * 0.3 +  // 长单词比例
    (specialCharCount / totalLength) * 0.2 +  // 特殊字符密度
    (lineBreakCount / (totalLength / 100)) * 0.25 +  // 换行密度
    (codeBlockCount > 0 ? 0.25 : 0)  // 代码块存在性
  ));

  return { totalLength, complexityScore };
}

/**
 * 获取请求性能指标
 */
export function getAIRequestMetrics() {
  return requestMetrics.getStats();
}

/**
 * 转换非流式响应为模拟流式响应
 * 用于缓存命中但需要流式返回的场景
 */
export function convertToStreamResponse(content: string, chunkSize: number = 20, delayMs: number = 10): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      let position = 0;

      function pushChunk() {
        if (position < content.length) {
          const end = Math.min(position + chunkSize, content.length);
          const chunk = content.substring(position, end);
          const data = {
            id: `chunk-${position}`,
            choices: [{
              delta: { content: chunk },
              index: 0,
              finish_reason: end === content.length ? 'stop' : null
            }]
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          position = end;

          // 模拟网络延迟
          setTimeout(pushChunk, delayMs);
        } else {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }

      // 开始发送块
      setTimeout(pushChunk, 0);
    }
  });
}
