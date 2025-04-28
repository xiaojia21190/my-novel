"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Share2, Save, Bookmark, BookmarkCheck, BookOpen, PenLine } from "lucide-react";
import { saveStory } from "@/lib/api-service";
import { useTheme } from "@/lib/theme-context";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

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
  const [editingText, setEditingText] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number>(-1);

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
      // 扩展正则表达式，使其适用于更多中文上下文
      // 不仅检查小写字母和标点符号，也考虑中文连续的情况
      const isLowerCaseOrPunctuation = /^[a-z,，;；、]$/.test(firstChar);

      // 处理中文句子连接 - 如果前一段不是以完整句子结尾，则认为当前段落是其延续
      // 不再严格要求新段落以小写字母或标点开头才视为连续
      if (!isCompleteEnding) {
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

  // 开始编辑段落
  const handleStartEditing = (text: string, index: number) => {
    setEditingText(text);
    setEditingIndex(index);
  };

  // 保存编辑内容
  const handleSaveEdit = () => {
    if (editingIndex >= 0 && editingIndex < coherentStoryParagraphs.length) {
      // 创建一个新的原始故事内容数组
      let newStoryContent = [...storyContent];

      // 由于coherentStoryParagraphs是经过处理合并的，
      // 所以这里我们需要简单地替换原始内容数组中对应的段落
      // 这是一个简化处理，实际上可能需要更复杂的逻辑来确保正确性
      if (editingIndex === 0) {
        newStoryContent[0] = editingText;
      } else {
        // 对于非第一段，我们可能需要根据段落映射或其他逻辑更新
        // 这里简单起见，我们直接更新与编辑索引匹配的段落
        const paragraphToUpdate = Math.min(editingIndex, newStoryContent.length - 1);
        newStoryContent[paragraphToUpdate] = editingText;
      }

      onGeneratePrompts(newStoryContent.join("\n\n"));
      setEditingIndex(-1);
    }
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
                <div key={index} className="relative py-1 rounded-sm group hover:bg-muted/30">
                  <p className={`leading-relaxed text-lg pr-8 ${isFirstParagraph ? "indent-2 first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-2 first-letter:float-left" : ""}`}>
                    {paragraph}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          onClick={() => handleStartEditing(paragraph, index)}
                          className="absolute inline-flex items-center p-1 transition-opacity -translate-y-1/2 rounded-full opacity-0 right-1 top-1/2 group-hover:opacity-100 bg-muted hover:bg-primary/10 text-primary hover:text-primary"
                          title="编辑段落"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="w-[90vw] sm:w-[80vw] md:max-w-[750px] h-[70vh] flex flex-col">
                        <DialogHeader className="mb-2 shrink-0">
                          <DialogTitle>快速编辑</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow overflow-hidden min-h-0 mb-2">
                          <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full h-full min-h-full resize-none border rounded-md" autoFocus style={{ height: "calc(100% - 4px)" }} />
                        </div>
                        <DialogFooter className="mt-1 shrink-0">
                          <DialogClose asChild>
                            <Button variant="outline" size="sm">
                              取消
                            </Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button onClick={handleSaveEdit} size="sm">
                              保存
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </p>
                </div>
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
