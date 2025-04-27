"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Share2, Save, Bookmark, BookmarkCheck, BookOpen } from "lucide-react";
import { saveStory } from "@/lib/api-service";
import { useTheme } from "@/lib/theme-context";

interface StoryContentProps {
  storyContent: string[];
  onGeneratePrompts: (content: string) => void;
  isGenerating: boolean;
}

export function StoryContent({ storyContent, onGeneratePrompts, isGenerating }: StoryContentProps) {
  const [storyTitle, setStoryTitle] = useState<string>("我的故事");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const { theme } = useTheme();

  const fullStoryText = storyContent.join("\n\n");

  // 保存故事
  const handleSaveStory = () => {
    try {
      saveStory(storyTitle, fullStoryText);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("保存故事失败:", error);
    }
  };

  // 分享故事
  const handleShareStory = () => {
    if (navigator.share) {
      navigator
        .share({
          title: storyTitle,
          text: fullStoryText,
        })
        .catch((err) => {
          console.error("分享失败:", err);
        });
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(fullStoryText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // 处理生成提示
  const handleGeneratePrompts = () => {
    onGeneratePrompts(fullStoryText);
  };

  return (
    <div className="w-full mb-16 animate-fadeIn">
      <Card className="overflow-hidden border-2 shadow-xl border-primary/20">
        <CardHeader className="pb-6 border-b bg-muted/40 border-border/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-primary" />
              <CardTitle className="text-2xl">你的故事</CardTitle>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleShareStory} title={copied ? "已复制" : "分享故事"} className="flex items-center transition-all shadow-sm hover:shadow-md">
                <Share2 className={`h-5 w-5 mr-2 ${copied ? "text-success" : ""}`} />
                {copied ? "已复制" : "分享"}
              </Button>
              <Button variant="outline" onClick={handleSaveStory} title={isSaved ? "已保存" : "保存故事"} className="flex items-center transition-all shadow-sm hover:shadow-md">
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-5 h-5 mr-2 text-success" />
                    已保存
                  </>
                ) : (
                  <>
                    <Bookmark className="w-5 h-5 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <Input value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder="故事标题" className="max-w-xl py-3 text-xl font-medium border-2 shadow-sm border-muted-foreground/20 focus:border-primary/40" />
          </div>
        </CardHeader>
        <CardContent className="p-8 bg-card/50">
          <div className={`prose prose-lg max-w-none ${theme === "dark" ? "prose-invert" : ""}`}>
            {storyContent.map((paragraph, index) => {
              // 跳过空段落或仅包含空白字符的段落
              if (!paragraph.trim()) return null;

              // 处理段落，使其更加连贯
              const isFirstParagraph = index === 0;

              return (
                <p key={index} className={`leading-relaxed text-lg ${isFirstParagraph ? "first-letter:text-6xl first-letter:font-bold first-letter:text-primary first-letter:mr-2 first-letter:float-left" : ""}`}>
                  {paragraph}
                </p>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center p-8 border-t bg-muted/40 border-border/30">
          <Button onClick={handleGeneratePrompts} disabled={isGenerating} className="w-2/3 py-7 text-lg transition-all shadow-lg hover:shadow-xl" variant="default">
            {isGenerating ? (
              <span className="flex items-center gap-3">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce animation-delay-100">·</span>
                <span className="animate-bounce animation-delay-200">·</span>
                <span> 生成中 </span>
                <span className="animate-bounce animation-delay-200">·</span>
                <span className="animate-bounce animation-delay-100">·</span>
                <span className="animate-bounce">·</span>
              </span>
            ) : (
              "生成后续提示"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
