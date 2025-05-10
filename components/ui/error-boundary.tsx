"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  errorComponent?: typeof ErrorFallback;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React错误边界组件
 * 捕获组件树中的JavaScript错误，显示备用UI，防止整个应用崩溃
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态，下次渲染时显示备用UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 可以记录错误信息到错误上报服务
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error("ErrorBoundary捕获到错误:", error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, errorComponent: ErrorComponent = ErrorFallback } = this.props;

    if (hasError && error) {
      // 使用自定义备用UI（如果提供）
      if (fallback) {
        if (typeof fallback === "function") {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // 否则使用默认错误组件
      return <ErrorComponent error={error} resetError={this.resetError} />;
    }

    return children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * 默认错误显示组件
 */
export function ErrorFallback({ error, resetError }: ErrorFallbackProps): React.ReactElement {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-red-200">
      <CardHeader className="bg-red-50">
        <CardTitle className="text-red-600 flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          发生错误
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-sm text-gray-600 mb-2">应用程序遇到了意外问题：</div>
        <div className="p-2 bg-gray-100 rounded text-sm font-mono overflow-auto max-h-32">{error.message || "未知错误"}</div>
      </CardContent>
      <CardFooter className="bg-gray-50 border-t flex justify-between">
        <Button variant="outline" onClick={resetError}>
          重试
        </Button>
        <Button variant="default" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ErrorBoundary;
