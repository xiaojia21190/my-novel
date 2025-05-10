"use client";

import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AppError, ErrorAction, ErrorSeverity } from "@/types/error";
import { useErrorHandler } from "@/lib/hooks/useErrorHandler";
import { XCircle, AlertTriangle, Info, RefreshCw, ArrowRight, Ban } from "lucide-react";

interface ErrorAlertProps {
  error?: AppError;
  errorId?: string;
  title?: string;
  description?: string;
  showActions?: boolean;
  className?: string;
  onDismiss?: () => void;
}

/**
 * 增强版错误提示组件，支持显示错误信息并提供操作按钮
 */
export function ErrorAlert({ error: propError, errorId, title, description, showActions = true, className = "", onDismiss }: ErrorAlertProps) {
  const { errors, lastError, retryFromError, redirectFromError, useFallbackForError, clearError } = useErrorHandler();

  // 确定要显示的错误
  const error = propError || (errorId ? errors.find((e) => e.id === errorId) : lastError);

  if (!error) return null;

  // 确定标题和描述
  const alertTitle = title || getDefaultErrorTitle(error);
  const alertDescription = description || error.message;

  // 确定错误图标
  const ErrorIcon = getErrorIcon(error.severity);

  // 处理操作按钮点击
  const handleRetry = async () => {
    await retryFromError(error.id);
    if (onDismiss) onDismiss();
  };

  const handleRedirect = async () => {
    await redirectFromError(error.id);
    if (onDismiss) onDismiss();
  };

  const handleFallback = async () => {
    await useFallbackForError(error.id);
    if (onDismiss) onDismiss();
  };

  const handleDismiss = () => {
    clearError(error.id);
    if (onDismiss) onDismiss();
  };

  // 确定要显示的操作按钮
  const getActionButtons = () => {
    if (!showActions) return null;

    const buttons = [];

    // 根据错误的推荐操作添加对应按钮
    if (error.recoverable) {
      if (error.recommendedAction === ErrorAction.RETRY) {
        buttons.push(
          <Button key="retry" variant="outline" size="sm" onClick={handleRetry} className="mb-1 mr-2">
            <RefreshCw className="w-4 h-4 mr-1" />
            重试
          </Button>
        );
      }

      if (error.recommendedAction === ErrorAction.REDIRECT) {
        buttons.push(
          <Button key="redirect" variant="outline" size="sm" onClick={handleRedirect} className="mb-1 mr-2">
            <ArrowRight className="w-4 h-4 mr-1" />
            前往登录
          </Button>
        );
      }

      if (error.recommendedAction === ErrorAction.FALLBACK) {
        buttons.push(
          <Button key="fallback" variant="outline" size="sm" onClick={handleFallback} className="mb-1 mr-2">
            <Ban className="w-4 h-4 mr-1" />
            使用备用响应
          </Button>
        );
      }
    }

    // 始终提供关闭按钮
    buttons.push(
      <Button key="dismiss" variant="ghost" size="sm" onClick={handleDismiss} className="mb-1">
        忽略
      </Button>
    );

    return <div className="flex flex-wrap mt-2">{buttons}</div>;
  };

  return (
    <Alert className={`mb-4 ${className}`} variant={getAlertVariant(error.severity)}>
      <ErrorIcon className="w-5 h-5" />
      <AlertTitle>{alertTitle}</AlertTitle>
      <AlertDescription className="mt-1">
        {alertDescription}
        {getActionButtons()}
      </AlertDescription>
    </Alert>
  );
}

// 辅助函数
function getDefaultErrorTitle(error: AppError): string {
  switch (error.category) {
    case "authentication":
      return "认证错误";
    case "api":
      return "API请求错误";
    case "ai_service":
      return "AI服务错误";
    case "network":
      return "网络连接错误";
    case "validation":
      return "验证错误";
    default:
      return "发生错误";
  }
}

function getAlertVariant(severity: ErrorSeverity): "default" | "destructive" {
  switch (severity) {
    case "critical":
    case "error":
      return "destructive";
    default:
      return "default";
  }
}

function getErrorIcon(severity: ErrorSeverity) {
  switch (severity) {
    case "critical":
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    case "info":
      return Info;
    default:
      return AlertTriangle;
  }
}

export default ErrorAlert;
