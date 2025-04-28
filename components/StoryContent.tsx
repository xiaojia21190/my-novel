"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Share2, Save, Bookmark, BookmarkCheck, BookOpen, PenLine } from "lucide-react";
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

  // 优化故事连贯性处理，将内容以更连贯的方式组合
  const combineStoryContents = () => {
    if (!storyContent || storyContent.length === 0) return [];

    // 创建一个新数组存储连贯的段落
    let coherentParagraphs: string[] = [];
    let currentParagraph = "";

    storyContent.forEach((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) return;

      // 第一个段落直接添加到结果中
      if (index === 0) {
        coherentParagraphs.push(trimmedParagraph);
        return;
      }

      // 获取上一个段落的最后一句
      const lastParagraph = coherentParagraphs[coherentParagraphs.length - 1];
      const lastChar = lastParagraph[lastParagraph.length - 1];
      const isCompleteEnding = /[。！？.!?]$/.test(lastChar);

      // 获取当前段落的第一个字符
      const firstChar = trimmedParagraph[0];
      const isLowerCaseOrPunctuation = /^[a-z,，;；、]$/.test(firstChar);

      // 如果上一段结尾不完整或当前段落以小写/标点开始，将它们连接在一起
      if (!isCompleteEnding || isLowerCaseOrPunctuation) {
        coherentParagraphs[coherentParagraphs.length - 1] += " " + trimmedParagraph;
      } else {
        coherentParagraphs.push(trimmedParagraph);
      }
    });

    return coherentParagraphs;
  };

  const coherentStoryParagraphs = combineStoryContents();
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
    <div className="flex flex-col w-full h-full animate-fadeIn">
      <Card className="flex flex-col h-full overflow-hidden border-2 shadow-xl border-primary/20">
        <CardHeader className="pb-2 border-b shrink-0 bg-muted/40 border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary" />
              <CardTitle className="text-xl">故事内容</CardTitle>
            </div>
            <div>
              <Input value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder="故事标题" className="py-1 text-base font-medium border-2 shadow-sm w-44 border-muted-foreground/20 focus:border-primary/40" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-6 overflow-auto bg-card/50">
          <div className={`prose prose-lg max-w-none ${theme === "dark" ? "prose-invert" : ""}`}>
            {coherentStoryParagraphs.map((paragraph, index) => {
              // 跳过空段落或仅包含空白字符的段落
              if (!paragraph.trim()) return null;

              // 处理段落，使其更加连贯
              const isFirstParagraph = index === 0;

              return (
                <p key={index} className={`leading-relaxed text-lg ${isFirstParagraph ? "first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-2 first-letter:float-left" : ""}`}>
                  {paragraph}
                </p>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex gap-4 p-3 border-t shrink-0 bg-muted/40 border-border/30">
          <Button onClick={handleShareStory} title={copied ? "已复制" : "分享故事"} className="flex items-center justify-center flex-1 py-2 transition-all shadow-sm hover:shadow-md" variant="outline">
            <Share2 className={`h-5 w-5 mr-2 ${copied ? "text-success" : ""}`} />
            {copied ? "已复制" : "分享"}
          </Button>

          <Button onClick={handleSaveStory} title={isSaved ? "已保存" : "保存故事"} className="flex items-center justify-center flex-1 py-2 transition-all shadow-sm hover:shadow-md" variant="outline">
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

          <Button onClick={handleGeneratePrompts} disabled={isGenerating} className="flex-1 py-2 text-base transition-all shadow-lg hover:shadow-xl" variant="default">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce animation-delay-100">·</span>
                <span className="animate-bounce animation-delay-200">·</span>
                <span>生成中</span>
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
