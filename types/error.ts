/**
 * 错误类型定义文件
 * 定义应用程序中的各种错误类型和错误处理相关接口
 */

// 错误类别枚举
export enum ErrorCategory {
  AUTHENTICATION = 'authentication', // 认证错误（401/403）
  API = 'api',                     // API处理错误（400/404/500）
  AI_SERVICE = 'ai_service',       // AI服务错误（超时/失败）
  NETWORK = 'network',             // 网络连接错误
  VALIDATION = 'validation',       // 数据验证错误
  UNKNOWN = 'unknown'              // 未知错误
}

// 错误严重程度
export enum ErrorSeverity {
  INFO = 'info',           // 信息性提示
  WARNING = 'warning',     // 警告（不影响主要功能）
  ERROR = 'error',         // 错误（影响当前操作）
  CRITICAL = 'critical'    // 严重错误（影响整个应用）
}

// 错误操作类型
export enum ErrorAction {
  RETRY = 'retry',             // 重试操作
  REDIRECT = 'redirect',       // 重定向到其他页面
  RELOAD = 'reload',           // 重新加载页面
  FALLBACK = 'fallback',       // 使用备用内容
  RESET = 'reset',             // 重置状态
  IGNORE = 'ignore'            // 忽略错误
}

// 应用错误接口
export interface AppError {
  id: string;                    // 唯一错误ID
  category: ErrorCategory;       // 错误类别
  severity: ErrorSeverity;       // 错误严重性
  message: string;               // 用户友好的错误消息
  originalError?: Error | any;   // 原始错误对象
  statusCode?: number;           // HTTP状态码（如果适用）
  timestamp: number;             // 错误发生时间戳
  context?: Record<string, any>; // 错误上下文信息
  recoverable: boolean;          // 是否可恢复
  recommendedAction?: ErrorAction; // 推荐的恢复操作
  actionUrl?: string;            // 操作相关URL（如重定向URL）
}

// 错误处理器接口
export interface ErrorHandler {
  captureError: (error: Error | any, context?: Record<string, any>) => AppError;
  clearError: (errorId?: string) => void;
  clearAllErrors: () => void;
  getLastError: () => AppError | null;
  getErrors: () => AppError[];
  performAction: (error: AppError, action: ErrorAction) => Promise<boolean>;
}

// 错误上下文类型
export interface ErrorContextType {
  errors: AppError[];
  lastError: AppError | null;
  addError: (error: Error | any, context?: Record<string, any>) => AppError;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  handleAction: (error: AppError, action: ErrorAction) => Promise<boolean>;
  hasErrors: boolean;
  isLoading: boolean;
}

// AI服务降级响应配置
export interface AIFallbackConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  fallbackResponses: Record<string, string[]>;
}

// API错误响应格式
export interface APIErrorResponse {
  error: string;
  message?: string;
  statusCode: number;
  path?: string;
  timestamp?: string;
  details?: Record<string, any>;
}
