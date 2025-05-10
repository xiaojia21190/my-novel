import { NextResponse } from "next/server";
import { AIError, AIErrorType } from "./ai-utils";

/**
 * 标准化的错误响应类型
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  suggestions?: string[];
}

/**
 * 为 API 路由创建标准化的错误响应
 */
export function createErrorResponse(error: unknown, defaultMessage: string = "操作失败"): NextResponse<ErrorResponse> {
  console.error("API错误:", error);

  // 处理 AIError 类型
  if (error instanceof AIError) {
    const statusCode = getStatusCodeForAIErrorType(error.type);
    const suggestions = getSuggestionsForAIErrorType(error.type);

    return NextResponse.json(
      {
        error: error.message,
        code: error.type,
        details: error.details,
        suggestions
      },
      { status: statusCode }
    );
  }

  // 处理常规 Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'UNKNOWN_ERROR',
        details: { name: error.name, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
      },
      { status: 500 }
    );
  }

  // 处理其他未知错误
  return NextResponse.json(
    {
      error: defaultMessage,
      code: 'UNKNOWN_ERROR',
      details: typeof error === 'object' ? error : { message: String(error) }
    },
    { status: 500 }
  );
}

/**
 * 根据 AI 错误类型获取合适的 HTTP 状态码
 */
function getStatusCodeForAIErrorType(type: AIErrorType): number {
  switch (type) {
    case AIErrorType.TIMEOUT:
      return 504; // Gateway Timeout
    case AIErrorType.SERVICE_ERROR:
      return 502; // Bad Gateway
    case AIErrorType.NETWORK_ERROR:
      return 503; // Service Unavailable
    case AIErrorType.AUTHORIZATION_ERROR:
      return 401; // Unauthorized
    case AIErrorType.INVALID_REQUEST:
      return 400; // Bad Request
    case AIErrorType.UNKNOWN:
    default:
      return 500; // Internal Server Error
  }
}

/**
 * 根据错误类型提供建议
 */
function getSuggestionsForAIErrorType(type: AIErrorType): string[] {
  switch (type) {
    case AIErrorType.TIMEOUT:
      return [
        "请稍后再试",
        "尝试减少请求的复杂度",
        "处理大型内容时，尝试分批处理"
      ];
    case AIErrorType.SERVICE_ERROR:
      return [
        "AI服务暂时不可用，请稍后再试",
        "可以尝试使用应用的离线功能"
      ];
    case AIErrorType.NETWORK_ERROR:
      return [
        "请检查您的网络连接",
        "如果问题持续，可能是服务器连接问题"
      ];
    case AIErrorType.AUTHORIZATION_ERROR:
      return [
        "请检查您的账户权限",
        "您可能需要重新登录"
      ];
    case AIErrorType.INVALID_REQUEST:
      return [
        "请检查您的输入内容是否合适",
        "尝试简化您的请求"
      ];
    case AIErrorType.UNKNOWN:
    default:
      return [
        "请稍后再试",
        "如果问题持续，请联系支持团队"
      ];
  }
}
