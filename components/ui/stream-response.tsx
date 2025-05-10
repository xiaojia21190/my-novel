"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface StreamResponseProps {
  streamUrl: string;
  requestBody: any;
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  placeholder?: string;
  initialPrompt?: string;
  fallbackContent?: string;
  maxRetries?: number;
}

// 错误类别枚举
enum ErrorCategory {
  TIMEOUT = "TIMEOUT",
  NETWORK = "NETWORK",
  SERVER = "SERVER",
  STREAM_INTERRUPTED = "STREAM_INTERRUPTED",
  UNKNOWN = "UNKNOWN",
}

// 解析错误响应
function parseErrorResponse(error: any): {
  message: string;
  category: ErrorCategory;
  canRetry: boolean;
  suggestions?: string[];
} {
  // 默认值
  let message = "发生未知错误";
  let category = ErrorCategory.UNKNOWN;
  let canRetry = true;
  let suggestions: string[] = ["请稍后再试"];

  // 如果是AbortError（超时或用户取消）
  if (error.name === "AbortError") {
    return {
      message: "请求超时或已取消",
      category: ErrorCategory.TIMEOUT,
      canRetry: true,
      suggestions: ["请稍后重试", "尝试简化您的请求"],
    };
  }

  // 如果是 API 返回的错误响应
  if (error.code) {
    // 尝试使用服务器返回的错误代码
    switch (error.code) {
      case "TIMEOUT":
        category = ErrorCategory.TIMEOUT;
        canRetry = true;
        break;
      case "NETWORK_ERROR":
        category = ErrorCategory.NETWORK;
        canRetry = true;
        break;
      case "SERVICE_ERROR":
        category = ErrorCategory.SERVER;
        canRetry = true;
        break;
      case "AUTHORIZATION_ERROR":
        category = ErrorCategory.SERVER;
        canRetry = false;
        break;
      case "INVALID_REQUEST":
        category = ErrorCategory.SERVER;
        canRetry = false;
        break;
      default:
        category = ErrorCategory.UNKNOWN;
        canRetry = true;
    }

    // 使用服务器返回的信息
    message = error.error || message;
    suggestions = error.suggestions || suggestions;
  }
  // 如果是网络错误
  else if (error.message && (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("连接"))) {
    category = ErrorCategory.NETWORK;
    message = "网络连接错误";
    suggestions = ["请检查您的网络连接", "如果您已连接网络，可能是服务器暂时不可用"];
  }

  return { message, category, canRetry, suggestions };
}

export function StreamResponse({ streamUrl, requestBody, onComplete, onError, className = "", placeholder = "AI正在思考中...", initialPrompt = "", fallbackContent, maxRetries = 2 }: StreamResponseProps) {
  const [streamedText, setStreamedText] = useState<string>(initialPrompt);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [partialText, setPartialText] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);

  // 流式请求处理函数
  const fetchStream = async () => {
    let text = initialPrompt;
    let partial = "";
    setIsLoading(true);
    setError(null);
    setIsRecovering(false);

    try {
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 30000); // 30秒超时

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 尝试解析错误响应
        const errorData = await response.json().catch(() => ({}));
        throw {
          ...errorData,
          status: response.status,
          statusText: response.statusText,
        };
      }

      if (!response.body) {
        throw new Error("响应没有提供可读流");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          setIsLoading(false);
          onComplete?.(text);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        text += chunk;
        partial += chunk;
        setStreamedText(text);

        // 每30个字符保存一次部分结果，用于潜在的恢复
        if (partial.length >= 30) {
          setPartialText(text);
          partial = "";
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError" || !abortControllerRef.current?.signal.aborted) {
        console.error("流式响应错误:", err);

        const parsedError = parseErrorResponse(err);
        setError(parsedError);

        // 如果有部分结果且错误是连接中断
        if (partialText && parsedError.category === ErrorCategory.NETWORK) {
          setIsRecovering(true);
        }

        onError?.(parsedError.message);
      }
      setIsLoading(false);
    }
  };

  // 初始请求和重试处理
  useEffect(() => {
    fetchStream();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [streamUrl, JSON.stringify(requestBody), retryCount]); // 当URL、请求体或重试计数变化时重新请求

  // 处理取消生成
  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  // 处理重试
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount((prev) => prev + 1);
    } else if (fallbackContent) {
      // 如果超过最大重试次数且有降级内容，则使用降级内容
      setStreamedText(fallbackContent);
      setIsLoading(false);
      setError(null);
      onComplete?.(fallbackContent);
    }
  };

  // 从中断处恢复
  const handleRecover = () => {
    if (partialText) {
      // 使用已有的部分结果继续请求
      const updatedBody = {
        ...requestBody,
        partialResult: partialText,
      };
      setStreamedText(partialText);
      setIsRecovering(false);

      // 创建新的AbortController
      abortControllerRef.current = new AbortController();

      // 发送恢复请求
      fetch(streamUrl.replace(/\/?$/, "/resume"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedBody),
        signal: abortControllerRef.current.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("恢复失败");
          return response.json();
        })
        .then((data) => {
          setStreamedText(partialText + data.completion);
          setIsLoading(false);
          onComplete?.(partialText + data.completion);
        })
        .catch((err) => {
          console.error("恢复流失败:", err);
          setError({
            message: "无法恢复流",
            category: ErrorCategory.UNKNOWN,
            canRetry: true,
            suggestions: ["请尝试重新生成"],
          });
        });
    } else {
      // 如果没有部分结果，则直接重试
      handleRetry();
    }
  };

  // 显示错误消息和建议
  const renderError = () => {
    if (!error) return null;

    return (
      <div className="p-3 mt-2 rounded-md bg-muted">
        <div className="flex items-center mb-2 text-destructive">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>{error.message}</span>
        </div>

        {error.suggestions && error.suggestions.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            <p className="font-semibold">建议:</p>
            <ul className="pl-4 mt-1 list-disc">
              {error.suggestions.map((suggestion: string, i: number) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end mt-2">
          {isRecovering && (
            <button onClick={handleRecover} className="flex items-center px-2 py-1 mr-2 text-xs rounded bg-primary text-primary-foreground">
              <RefreshCw className="w-3 h-3 mr-1" /> 从中断处恢复
            </button>
          )}

          {error.canRetry && retryCount < maxRetries && (
            <button onClick={handleRetry} className="flex items-center px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground">
              <RefreshCw className="w-3 h-3 mr-1" /> 重试 ({retryCount + 1}/{maxRetries})
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute top-0 right-0 z-10 flex items-center gap-2 p-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <button onClick={handleCancel} className="text-xs text-muted-foreground hover:text-destructive">
            取消
          </button>
        </div>
      )}

      <div className="min-h-[100px] whitespace-pre-wrap">{streamedText || (isLoading ? placeholder : "")}</div>

      {!isLoading && error && renderError()}

      {!isLoading && !streamedText && !error && <div className="italic text-muted-foreground">未生成内容</div>}
    </div>
  );
}
