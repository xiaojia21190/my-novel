'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { withAIFallback } from '@/lib/ai-service-fallback';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { ErrorCategory } from '@/types/error';

interface UseAIOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  useFallback?: boolean; // 是否在失败时使用降级策略
  fallbackType?: string; // 降级类型
  maxRetries?: number; // 最大重试次数
}

/**
 * AI功能调用钩子，统一管理AI操作的状态
 * @param apiFunction AI功能API调用函数
 * @param options 配置选项
 */
export function useAI<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseAIOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const errorHandler = useErrorHandler({
    context: { functionName: apiFunction.name },
    autoExecuteAction: false
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setIsLoading(true);
      setError(null);

      try {
        // 如果启用了fallback，使用withAIFallback包装函数
        const result = options.useFallback
          ? await withAIFallback(
            apiFunction,
            options.fallbackType || 'ai-assistance',
            args,
            { maxRetries: options.maxRetries || 3 }
          )
          : await apiFunction(...args);

        setData(result as T);
        setIsLoading(false);

        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result as T;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);

        // 将错误添加到错误上下文
        const appError = errorHandler.captureError(error);

        // 显示错误提示
        toast.error(options.errorMessage || error.message);

        if (options.onError) {
          options.onError(error);
        }

        // 如果是AI服务错误，提供重试选项
        if (errorHandler.isAIServiceError()) {
          toast.error('AI服务暂时不可用。可以尝试重试或继续在没有AI辅助的情况下工作。', {
            action: {
              label: '重试',
              onClick: () => execute(...args)
            },
            duration: 5000
          });
        }

        throw error;
      }
    },
    [apiFunction, options, errorHandler]
  );

  return {
    execute,
    data,
    isLoading,
    error,
    reset: useCallback(() => {
      setData(null);
      setError(null);
    }, []),
    // 添加显式重试方法
    retry: useCallback((...args: any[]) => {
      if (args.length === 0 && error) {
        // 如果没有提供参数但有错误，尝试使用之前的参数重试
        return execute();
      }
      return execute(...args);
    }, [execute, error])
  };
}

/**
 * 为常见AI任务提供预配置的钩子
 */
export const useAIAssistant = (options?: UseAIOptions) => {
  return useAI(
    async (storyId: string, params: any) => {
      const response = await fetch(`/api/user/story/${storyId}/ai-assistance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `获取AI辅助失败：${response.status}`);
      }

      const data = await response.json();
      return data.data?.result || '';
    },
    {
      successMessage: options?.successMessage || 'AI助手已生成内容',
      errorMessage: options?.errorMessage || 'AI生成失败，请稍后重试',
      useFallback: true,
      fallbackType: 'ai-assistance',
      ...options
    }
  );
};

/**
 * 专门用于故事反馈的钩子
 */
export const useAIFeedback = (options?: UseAIOptions) => {
  return useAI(
    async (storyId: string) => {
      const response = await fetch(`/api/user/story/${storyId}/ai-assistant/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `获取故事反馈失败：${response.status}`);
      }

      const data = await response.json();
      return {
        feedback: data.data?.result || '',
        title: data.data?.title || '故事反馈'
      };
    },
    {
      successMessage: options?.successMessage || '故事反馈已生成',
      errorMessage: options?.errorMessage || '生成反馈失败，请稍后重试',
      ...options
    }
  );
};

/**
 * 专门用于一致性检查的钩子
 */
export const useAIConsistency = (options?: UseAIOptions) => {
  return useAI(
    async (storyId: string, content: string, consistencyType: string, chapterId?: string) => {
      const response = await fetch(`/api/user/story/${storyId}/analyze-consistency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: consistencyType, chapterId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `一致性检查失败：${response.status}`);
      }

      const data = await response.json();
      return data.data || {};
    },
    {
      successMessage: options?.successMessage || '一致性检查完成',
      errorMessage: options?.errorMessage || '一致性检查失败，请稍后重试',
      ...options
    }
  );
};

/**
 * 专门用于大纲生成的钩子
 */
export const useAIOutline = (options?: UseAIOptions) => {
  return useAI(
    async (storyId: string, theme: string, genre: string, notes: string, isStream: boolean = false) => {
      const response = await fetch(`/api/user/story/${storyId}/outline/generate-from-characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, genre, notes, isStream }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `生成大纲失败：${response.status}`);
      }

      const data = await response.json();
      return data.outline || '';
    },
    {
      successMessage: options?.successMessage || '故事大纲已生成',
      errorMessage: options?.errorMessage || '生成大纲失败，请稍后重试',
      ...options
    }
  );
};

/**
 * 专门用于章节生成的钩子
 */
export const useAIChapter = (options?: UseAIOptions) => {
  return useAI(
    async (storyId: string, outlineSection: string, chapterTitle: string, previousChapterId?: string, isStream: boolean = false) => {
      const response = await fetch(`/api/user/story/${storyId}/chapter/generate-from-outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineSection, chapterTitle, previousChapterId, isStream }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `生成章节失败：${response.status}`);
      }

      const data = await response.json();
      return data.chapter || { content: '' };
    },
    {
      successMessage: options?.successMessage || '章节内容已生成',
      errorMessage: options?.errorMessage || '生成章节失败，请稍后重试',
      ...options
    }
  );
};

/**
 * 专门用于角色生成的钩子
 */
export const useAICharacter = (options?: UseAIOptions) => {
  return useAI(
    async (prompt: string) => {
      const response = await fetch('/api/generate/character-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `生成角色描述失败：${response.status}`);
      }

      const data = await response.json();
      return data.description || '';
    },
    {
      successMessage: options?.successMessage || '角色描述已生成',
      errorMessage: options?.errorMessage || '生成角色描述失败，请稍后重试',
      ...options
    }
  );
};

/**
 * 专门用于写作建议的钩子
 */
export const useAIWritingSuggestion = (options?: UseAIOptions) => {
  return useAI(
    async (prompt: string) => {
      const response = await fetch("/api/generate/writing-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      return await response.text();
    },
    {
      successMessage: options?.successMessage || '写作建议已生成',
      errorMessage: options?.errorMessage || '生成写作建议失败，请稍后重试',
      ...options
    }
  );
};
