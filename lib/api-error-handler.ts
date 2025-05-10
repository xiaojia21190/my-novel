/**
 * API错误处理工具
 * 提供统一的API错误拦截和处理机制
 */

import { ErrorCategory, ErrorSeverity, APIErrorResponse } from '@/types/error';

// 定义API错误类型
interface APIErrorOptions {
  message?: string;
  statusCode?: number;
  path?: string;
  details?: Record<string, any>;
}

// API错误类
export class APIError extends Error {
  statusCode: number;
  path?: string;
  details?: Record<string, any>;
  errorCategory: ErrorCategory;
  errorSeverity: ErrorSeverity;

  constructor(message: string, options: APIErrorOptions = {}) {
    super(message);
    this.name = 'APIError';
    this.statusCode = options.statusCode || 500;
    this.path = options.path;
    this.details = options.details;

    // 设置错误类别
    if (this.statusCode === 401 || this.statusCode === 403) {
      this.errorCategory = ErrorCategory.AUTHENTICATION;
      this.errorSeverity = ErrorSeverity.WARNING;
    } else if (this.statusCode >= 500) {
      this.errorCategory = ErrorCategory.API;
      this.errorSeverity = ErrorSeverity.ERROR;
    } else {
      this.errorCategory = ErrorCategory.API;
      this.errorSeverity = ErrorSeverity.WARNING;
    }
  }

  // 转换为标准API错误响应
  toResponse(): APIErrorResponse {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      path: this.path,
      timestamp: new Date().toISOString(),
      details: this.details
    };
  }
}

// AI服务错误类
export class AIServiceError extends Error {
  statusCode: number;
  errorCategory: ErrorCategory = ErrorCategory.AI_SERVICE;
  errorSeverity: ErrorSeverity = ErrorSeverity.WARNING;
  retryable: boolean;

  constructor(message: string, retryable = true, statusCode = 503) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }

  // 转换为标准API错误响应
  toResponse(): APIErrorResponse {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: new Date().toISOString(),
      details: { retryable: this.retryable }
    };
  }
}

/**
 * 解析API响应错误
 * @param response Fetch API响应对象
 */
export async function parseResponseError(response: Response): Promise<APIError> {
  let errorData: any = {};

  try {
    errorData = await response.json();
  } catch (e) {
    // 如果响应不是有效的JSON，使用默认错误消息
  }

  const message = errorData.message || errorData.error || `请求失败 (${response.status})`;

  return new APIError(message, {
    statusCode: response.status,
    path: response.url,
    details: errorData.details
  });
}

/**
 * 处理API请求异常
 * @param error 捕获的错误
 * @param fallbackMessage 备用错误消息
 */
export function handleApiException(error: any, fallbackMessage = '请求处理失败'): APIError {
  console.error('API请求异常:', error);

  // 如果已经是APIError，直接返回
  if (error instanceof APIError) {
    return error;
  }

  // 如果是网络错误
  if (error instanceof TypeError && error.message.includes('network')) {
    return new APIError('网络连接错误，请检查您的网络设置', {
      statusCode: 0,
      details: { originalError: error.message }
    });
  }

  // 如果是超时错误
  if (error.name === 'AbortError' || (error.message && error.message.includes('timeout'))) {
    return new APIError('请求超时，请稍后重试', {
      statusCode: 408,
      details: { originalError: error.message }
    });
  }

  // 默认返回一个通用API错误
  return new APIError(error.message || fallbackMessage, {
    statusCode: error.status || error.statusCode || 500,
    details: { originalError: error.message }
  });
}

/**
 * 一般API错误响应创建函数
 * @param message 错误消息
 * @param statusCode HTTP状态码
 */
export function createErrorResponse(message: string, statusCode = 500): Response {
  const error = new APIError(message, { statusCode });
  return new Response(JSON.stringify(error.toResponse()), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 身份验证错误响应创建函数
 * @param message 错误消息
 */
export function createAuthErrorResponse(message = '需要登录才能访问此资源'): Response {
  const error = new APIError(message, { statusCode: 401 });
  return new Response(JSON.stringify(error.toResponse()), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * AI服务错误响应创建函数
 * @param message 错误消息
 * @param retryable 是否可重试
 */
export function createAIServiceErrorResponse(
  message = 'AI服务暂时不可用',
  retryable = true
): Response {
  const error = new AIServiceError(message, retryable);
  return new Response(JSON.stringify(error.toResponse()), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 安全错误处理包装器
 * 捕获异步函数中的错误并返回标准化响应
 */
export function withErrorHandling(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      const apiError = handleApiException(error);
      return new Response(JSON.stringify(apiError.toResponse()), {
        status: apiError.statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * 权限错误类
 * 用于表示用户无权访问或操作特定资源的错误
 */
export class PermissionError extends Error {
  statusCode: number = 403;
  resourceType?: 'story' | 'chapter' | 'character' | string;
  resourceId?: string;
  errorCategory: ErrorCategory = ErrorCategory.AUTHENTICATION;
  errorSeverity: ErrorSeverity = ErrorSeverity.WARNING;

  constructor(
    message: string,
    resourceType?: 'story' | 'chapter' | 'character' | string,
    resourceId?: string
  ) {
    super(message);
    this.name = 'PermissionError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  // 转换为标准API错误响应
  toResponse(): APIErrorResponse {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: new Date().toISOString(),
      details: {
        resourceType: this.resourceType,
        resourceId: this.resourceId
      }
    };
  }
}

/**
 * 权限错误响应创建函数
 * @param message 错误消息
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 */
export function createPermissionErrorResponse(
  message = '您没有权限执行此操作',
  resourceType?: 'story' | 'chapter' | 'character' | string,
  resourceId?: string
): Response {
  const error = new PermissionError(message, resourceType, resourceId);
  return new Response(JSON.stringify(error.toResponse()), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 处理权限验证
 * 包装异步资源操作，自动处理权限检查
 * @param handler 处理函数
 * @param permissionCheck 权限检查函数
 */
export function withPermissionCheck(
  handler: Function,
  permissionCheck: Function
) {
  return async (...args: any[]) => {
    try {
      // 执行权限检查
      const hasPermission = await permissionCheck(...args);

      if (!hasPermission) {
        return createPermissionErrorResponse();
      }

      // 通过权限检查，执行原始处理函数
      return await handler(...args);
    } catch (error: any) {
      // 如果是PermissionError，直接返回权限错误响应
      if (error instanceof PermissionError) {
        return createPermissionErrorResponse(error.message, error.resourceType, error.resourceId);
      }

      // 其他错误使用通用错误处理
      const apiError = handleApiException(error);
      return new Response(JSON.stringify(apiError.toResponse()), {
        status: apiError.statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
