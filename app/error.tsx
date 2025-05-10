"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { ErrorCategory } from "@/types/error";
import { useErrorHandler } from "@/lib/hooks/useErrorHandler";

export default function ErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCategory = (searchParams.get("category") as ErrorCategory) || ErrorCategory.UNKNOWN;
  const errorMessage = searchParams.get("message") || "发生未知错误";
  const statusCode = searchParams.get("status") || "500";
  const returnUrl = searchParams.get("returnUrl") || "/";

  const errorHandler = useErrorHandler();

  useEffect(() => {
    // 将错误添加到错误上下文
    errorHandler.captureError(new Error(errorMessage));
  }, [errorHandler, errorMessage, errorCategory, statusCode, returnUrl]);

  const getErrorTitle = () => {
    switch (errorCategory) {
      case ErrorCategory.AUTHENTICATION:
        return "访问受限";
      case ErrorCategory.API:
        return "API请求失败";
      case ErrorCategory.AI_SERVICE:
        return "AI服务暂时不可用";
      case ErrorCategory.NETWORK:
        return "网络连接错误";
      default:
        return "发生错误";
    }
  };

  const getErrorDescription = () => {
    switch (errorCategory) {
      case ErrorCategory.AUTHENTICATION:
        return "您需要登录才能访问此页面。请登录后再试。";
      case ErrorCategory.API:
        return "服务器处理请求时发生错误。这可能是暂时的问题，请稍后再试。";
      case ErrorCategory.AI_SERVICE:
        return "AI服务当前不可用。您仍然可以使用应用的其他功能，或稍后再试。";
      case ErrorCategory.NETWORK:
        return "无法连接到服务器。请检查您的网络连接并刷新页面。";
      default:
        return "应用程序遇到了意外问题。请尝试刷新页面或返回首页。";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 bg-muted/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
          </div>
          <CardDescription>{getErrorDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-2 text-sm text-muted-foreground">错误详情:</div>
          <div className="p-3 text-sm border rounded bg-muted/30">{errorMessage}</div>
          {statusCode && <div className="mt-2 text-sm text-muted-foreground">状态码: {statusCode}</div>}
        </CardContent>
        <CardFooter className="flex justify-between gap-4 p-4 border-t">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Button variant="outline" onClick={() => router.refresh()} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button variant="default" asChild className="flex-1">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              首页
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
