'use client';

import { useCallback } from 'react';
import { useErrorContext } from '@/lib/error-context';
import { AppError, ErrorAction, ErrorCategory } from '@/types/error';

interface ErrorHandlerOptions {
  // 当调用captureError时要包含的额外上下文
  context?: Record<string, any>;
  // 是否自动执行推荐动作
  autoExecuteAction?: boolean;
  // 自定义错误处理动作
  customAction?: ErrorAction;
}

/**
 * 错误处理钩子，提供了简化的错误处理接口
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { addError, removeError, clearErrors, handleAction, errors, lastError, hasErrors } = useErrorContext();

  /**
   * 捕获错误并将其添加到错误上下文
   */
  const captureError = useCallback(
    async (error: Error | any): Promise<AppError> => {
      const appError = addError(error, options.context);

      // 自动执行推荐动作
      if (options.autoExecuteAction) {
        const action = options.customAction || appError.recommendedAction;
        if (action) {
          await handleAction(appError, action);
        }
      }

      return appError;
    },
    [addError, handleAction, options.context, options.autoExecuteAction, options.customAction]
  );

  /**
   * 重试捕获到的错误相关操作
   */
  const retryFromError = useCallback(
    async (errorId?: string): Promise<boolean> => {
      // 如果未指定错误ID，使用最后一个错误
      const targetError = errorId
        ? errors.find(e => e.id === errorId)
        : lastError;

      if (targetError) {
        return await handleAction(targetError, ErrorAction.RETRY);
      }

      return false;
    },
    [errors, lastError, handleAction]
  );

  /**
   * 重定向到错误指定的URL
   */
  const redirectFromError = useCallback(
    async (errorId?: string): Promise<boolean> => {
      const targetError = errorId
        ? errors.find(e => e.id === errorId)
        : lastError;

      if (targetError) {
        return await handleAction(targetError, ErrorAction.REDIRECT);
      }

      return false;
    },
    [errors, lastError, handleAction]
  );

  /**
   * 使用备用内容替代错误内容
   */
  const useFallbackForError = useCallback(
    async (errorId?: string): Promise<boolean> => {
      const targetError = errorId
        ? errors.find(e => e.id === errorId)
        : lastError;

      if (targetError) {
        return await handleAction(targetError, ErrorAction.FALLBACK);
      }

      return false;
    },
    [errors, lastError, handleAction]
  );

  /**
   * 判断是否是认证错误
   */
  const isAuthError = useCallback(
    (errorId?: string): boolean => {
      const targetError = errorId
        ? errors.find(e => e.id === errorId)
        : lastError;

      return targetError?.category === ErrorCategory.AUTHENTICATION;
    },
    [errors, lastError]
  );

  /**
   * 判断是否是网络错误
   */
  const isNetworkError = useCallback(
    (errorId?: string): boolean => {
      const targetError = errorId
        ? errors.find(e => e.id === errorId)
        : lastError;

      return targetError?.category === ErrorCategory.NETWORK;
    },
    [errors, lastError]
  );

  /**
   * 判断是否是AI服务错误
   */
  const isAIServiceError = useCallback(
    (errorId?: string): boolean => {
      const targetError = errorId
        ? errors.find(e => e.id === errorId)
        : lastError;

      return targetError?.category === ErrorCategory.AI_SERVICE;
    },
    [errors, lastError]
  );

  /**
   * 清除特定错误
   */
  const clearError = useCallback(
    (errorId?: string) => {
      if (errorId) {
        removeError(errorId);
      } else if (lastError) {
        removeError(lastError.id);
      }
    },
    [removeError, lastError]
  );

  return {
    captureError,
    retryFromError,
    redirectFromError,
    useFallbackForError,
    clearError,
    clearAllErrors: clearErrors,
    isAuthError,
    isNetworkError,
    isAIServiceError,
    errors,
    lastError,
    hasErrors
  };
}

export default useErrorHandler;
