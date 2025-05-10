"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllStories, deleteStory, StoredStory } from "@/lib/api-service";
import { Clock, Trash2, Share2, ArrowRight, CloudOff } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

interface StoryHistoryProps {
  onSelectStory?: (story: StoredStory) => void;
  onClose?: () => void;
}

export function StoryHistory({ onSelectStory, onClose }: StoryHistoryProps) {
  const [stories, setStories] = useState<StoredStory[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, isSignedIn } = useAuth();

  // 加载保存的故事
  useEffect(() => {
    const loadStories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const allStories = await getAllStories();
        setStories(allStories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      } catch (err) {
        console.error("加载故事失败:", err);
        setError("无法加载故事历史，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    loadStories();

    // 添加storage事件监听器，以便在其他地方保存故事时更新列表
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "novel_stories") {
        loadStories();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isSignedIn]); // 当登录状态变化时重新加载

  // 删除故事
  const handleDeleteStory = async (id: string) => {
    try {
      const success = await deleteStory(id);
      if (success) {
        setStories((prev) => prev.filter((story) => story.id !== id));
      }
    } catch (err) {
      console.error("删除故事失败:", err);
      setError("删除故事失败，请稍后重试");
    }
  };

  // 分享故事
  const handleShareStory = (story: StoredStory) => {
    const fullStoryText = story.content.join("\n\n");

    if (navigator.share) {
      navigator
        .share({
          title: story.title,
          text: fullStoryText,
        })
        .catch((err) => {
          console.error("分享失败:", err);
        });
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(fullStoryText).then(() => {
        setCopied(story.id);
        setTimeout(() => setCopied(null), 2000);
      });
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 截断内容
  const truncateContent = (content: string[], maxLength: number = 150) => {
    const fullText = content.join(" ");
    if (fullText.length <= maxLength) return fullText;
    return fullText.substring(0, maxLength) + "...";
  };

  return (
    <div className="w-full animate-fadeIn">
      <Card className="border-2 shadow-xl border-primary/20">
        <CardHeader className="py-6 bg-muted/40">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Clock className="w-7 h-7 text-primary" />
              故事历史
              {isLoaded && !isSignedIn && (
                <span className="flex items-center text-sm font-normal text-muted-foreground">
                  <CloudOff className="w-4 h-4 mr-1" />
                  未登录，仅显示本地故事
                </span>
              )}
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="lg" onClick={onClose}>
                关闭
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 rounded-full border-primary border-t-transparent animate-spin"></div>
              <span className="ml-3 text-lg text-muted-foreground">正在加载故事...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                重试
              </Button>
            </div>
          ) : stories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xl text-muted-foreground">暂无保存的故事历史</p>
              {isLoaded && !isSignedIn && <p className="mt-2 text-sm text-muted-foreground">登录后可以在不同设备间同步你的故事</p>}
            </div>
          ) : (
            <div className="grid gap-6">
              {stories.map((story) => (
                <Card key={story.id} className="overflow-hidden transition-all border-2 border-muted-foreground/20 hover:shadow-lg">
                  <CardHeader className="p-6 bg-muted/40">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">{story.title}</h3>
                      <span className="text-base text-muted-foreground">{formatDate(story.updatedAt)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-lg line-clamp-3">{truncateContent(story.content)}</p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 p-4 bg-muted/20">
                    <Button variant="ghost" onClick={() => handleShareStory(story)} title={copied === story.id ? "已复制" : "分享故事"}>
                      <Share2 className={`h-5 w-5 mr-2 ${copied === story.id ? "text-success" : ""}`} />
                      {copied === story.id ? "已复制" : "分享"}
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteStory(story.id)} title="删除故事" className="hover:text-destructive">
                      <Trash2 className="w-5 h-5 mr-2" />
                      删除
                    </Button>
                    {onSelectStory && (
                      <Button variant="ghost" className="ml-2" onClick={() => onSelectStory(story)} title="继续这个故事">
                        <span className="mr-2">继续</span>
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
