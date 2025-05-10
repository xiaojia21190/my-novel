"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { AppError, ErrorCategory, ErrorSeverity, ErrorAction, ErrorContextType } from "@/types/error";
import { toast } from "sonner";

// 创建错误上下文
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// 默认错误处理动作
const DEFAULT_ACTION_MAP: Record<ErrorCategory, ErrorAction> = {
  [ErrorCategory.AUTHENTICATION]: ErrorAction.REDIRECT,
  [ErrorCategory.API]: ErrorAction.RETRY,
  [ErrorCategory.AI_SERVICE]: ErrorAction.FALLBACK,
  [ErrorCategory.NETWORK]: ErrorAction.RETRY,
  [ErrorCategory.VALIDATION]: ErrorAction.RESET,
  [ErrorCategory.UNKNOWN]: ErrorAction.RELOAD,
};

// 错误分类逻辑
function categorizeError(error: Error | any): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;

  // 如果是响应错误
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    if (status === 401 || status === 403) {
      return ErrorCategory.AUTHENTICATION;
    }
    return ErrorCategory.API;
  }

  // 网络错误
  if (error.message && (error.message.includes("network") || error.message.includes("Network") || error.message.includes("连接") || error.message.includes("connection") || error.name === "TypeError")) {
    return ErrorCategory.NETWORK;
  }

  // AI服务错误
  if (error.message && (error.message.includes("AI") || error.message.includes("生成") || error.message.includes("超时") || error.message.includes("timeout"))) {
    return ErrorCategory.AI_SERVICE;
  }

  // 验证错误
  if (error.name === "ValidationError" || (error.message && error.message.includes("validation"))) {
    return ErrorCategory.VALIDATION;
  }

  return ErrorCategory.UNKNOWN;
}

// 确定错误严重级别
function determineSeverity(category: ErrorCategory, error: Error | any): ErrorSeverity {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return ErrorSeverity.WARNING;
    case ErrorCategory.NETWORK:
      return ErrorSeverity.ERROR;
    case ErrorCategory.AI_SERVICE:
      return ErrorSeverity.WARNING; // AI错误通常可以有降级方案
    case ErrorCategory.API:
      // 5xx错误更严重
      if (error.status >= 500 || error.statusCode >= 500) {
        return ErrorSeverity.ERROR;
      }
      return ErrorSeverity.WARNING;
    case ErrorCategory.VALIDATION:
      return ErrorSeverity.INFO;
    default:
      return ErrorSeverity.ERROR;
  }
}

// 确定错误是否可恢复
function isRecoverable(category: ErrorCategory): boolean {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.NETWORK:
    case ErrorCategory.AI_SERVICE:
    case ErrorCategory.VALIDATION:
      return true;
    case ErrorCategory.API:
      return true; // 大多数API错误可以通过重试恢复
    default:
      return false;
  }
}

// 错误上下文提供者组件
export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 添加错误
  const addError = useCallback((error: Error | any, context?: Record<string, any>): AppError => {
    const category = categorizeError(error);
    const severity = determineSeverity(category, error);
    const recoverable = isRecoverable(category);
    const recommendedAction = DEFAULT_ACTION_MAP[category];

    // 从错误中获取消息
    let message = error.message || "发生未知错误";
    // 对认证错误使用更友好的消息
    if (category === ErrorCategory.AUTHENTICATION) {
      message = "您需要登录才能访问此功能";
    }

    const appError: AppError = {
      id: uuidv4(),
      category,
      severity,
      message,
      originalError: error,
      statusCode: error.status || error.statusCode,
      timestamp: Date.now(),
      context,
      recoverable,
      recommendedAction,
    };

    // 如果是认证错误，设置跳转URL
    if (category === ErrorCategory.AUTHENTICATION) {
      appError.actionUrl = `/signin?redirect_url=${encodeURIComponent(window.location.pathname)}`;
    }

    setErrors((prev) => [...prev, appError]);

    // 显示错误通知
    if (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) {
      toast.error(message);
    } else if (severity === ErrorSeverity.WARNING) {
      toast.warning(message);
    }

    return appError;
  }, []);

  // 移除特定错误
  const removeError = useCallback((errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId));
  }, []);

  // 清除所有错误
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // 执行错误处理动作
  const handleAction = useCallback(
    async (error: AppError, action: ErrorAction): Promise<boolean> => {
      setIsLoading(true);

      try {
        switch (action) {
          case ErrorAction.RETRY:
            // 实际的重试逻辑需要由调用者实现
            removeError(error.id);
            return true;

          case ErrorAction.REDIRECT:
            if (error.actionUrl) {
              window.location.href = error.actionUrl;
            } else if (error.category === ErrorCategory.AUTHENTICATION) {
              window.location.href = `/signin?redirect_url=${encodeURIComponent(window.location.pathname)}`;
            }
            return true;

          case ErrorAction.RELOAD:
            window.location.reload();
            return true;

          case ErrorAction.RESET:
            removeError(error.id);
            return true;

          case ErrorAction.IGNORE:
            removeError(error.id);
            return true;

          default:
            return false;
        }
      } finally {
        setIsLoading(false);
      }
    },
    [removeError]
  );

  // 计算最后一个错误
  const lastError = useMemo(() => {
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }, [errors]);

  // 组合上下文值
  const contextValue = useMemo(
    () => ({
      errors,
      lastError,
      addError,
      removeError,
      clearErrors,
      handleAction,
      hasErrors: errors.length > 0,
      isLoading,
    }),
    [errors, lastError, addError, removeError, clearErrors, handleAction, isLoading]
  );

  return <ErrorContext.Provider value={contextValue}>{children}</ErrorContext.Provider>;
}

// 使用错误上下文的钩子
export function useErrorContext(): ErrorContextType {
  const context = useContext(ErrorContext);

  if (context === undefined) {
    throw new Error("useErrorContext must be used within an ErrorProvider");
  }

  return context;
}

// 导出默认的上下文提供者
export default ErrorProvider;
