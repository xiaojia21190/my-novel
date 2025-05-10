"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface FallbackContentProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
  contentType?: "ai" | "data" | "image" | "chapter" | "generic";
}

/**
 * 降级内容组件
 * 在数据加载失败或AI服务不可用时显示备用内容
 */
export function FallbackContent({ title, message, icon, onRetry, isLoading = false, children, contentType = "generic" }: FallbackContentProps) {
  // 根据内容类型生成默认值
  const defaultTitle = getDefaultTitle(contentType);
  const defaultMessage = getDefaultMessage(contentType);
  const displayTitle = title || defaultTitle;
  const displayMessage = message || defaultMessage;
  const displayIcon = icon || <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />;

  // 如果提供了自定义子内容，直接显示
  if (children) {
    return <div>{children}</div>;
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-center text-amber-700">{displayTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        {displayIcon}
        <p className="text-center text-sm text-gray-600 max-w-md">{displayMessage}</p>
        {getFallbackSuggestion(contentType)}
      </CardContent>
      {onRetry && (
        <CardFooter className="flex justify-center border-t pt-4 pb-4">
          <Button variant="outline" onClick={onRetry} disabled={isLoading} className="min-w-[120px]">
            {isLoading ? (
              "加载中..."
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// 辅助函数：根据内容类型获取默认标题
function getDefaultTitle(contentType: FallbackContentProps["contentType"]): string {
  switch (contentType) {
    case "ai":
      return "AI服务暂时不可用";
    case "data":
      return "数据加载失败";
    case "image":
      return "图片加载失败";
    case "chapter":
      return "章节内容无法加载";
    default:
      return "内容暂时不可用";
  }
}

// 辅助函数：根据内容类型获取默认消息
function getDefaultMessage(contentType: FallbackContentProps["contentType"]): string {
  switch (contentType) {
    case "ai":
      return "我们的AI服务目前遇到了一些问题。请稍后再试或继续以离线模式工作。";
    case "data":
      return "无法从服务器加载数据。这可能是由于网络连接问题或服务器暂时不可用。";
    case "image":
      return "无法加载图片资源。请检查您的网络连接并刷新页面。";
    case "chapter":
      return "无法加载章节内容。您可以尝试刷新页面或者返回故事主页。";
    default:
      return "请求的内容当前无法显示。请稍后再试。";
  }
}

// 辅助函数：获取针对不同内容类型的建议
function getFallbackSuggestion(contentType: FallbackContentProps["contentType"]): React.ReactNode {
  switch (contentType) {
    case "ai":
      return (
        <ul className="text-xs text-gray-500 mt-4 space-y-1 list-disc pl-5">
          <li>您可以继续编辑现有内容</li>
          <li>手动保存您的工作</li>
          <li>稍后再使用AI辅助功能</li>
        </ul>
      );
    case "chapter":
      return (
        <ul className="text-xs text-gray-500 mt-4 space-y-1 list-disc pl-5">
          <li>如果您有本地备份，可以尝试恢复</li>
          <li>检查网络连接状态</li>
          <li>联系支持团队获取帮助</li>
        </ul>
      );
    default:
      return null;
  }
}

export default FallbackContent;
