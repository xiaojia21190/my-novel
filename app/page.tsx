"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoryBeginning } from "@/components/StoryBeginning";
import { StoryInterface } from "@/components/StoryInterface";
import { StoryHistory } from "@/components/StoryHistory";
import { useTheme } from "@/lib/theme-context";
import { generatePrompts, continueStory, StoredStory } from "@/lib/api-service";
import { Moon, Sun, HomeIcon, Book, History, Sparkles, BookOpen } from "lucide-react";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [selectedBeginning, setSelectedBeginning] = useState<string | null>(null);
  const [storyContent, setStoryContent] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 选择故事开头
  const handleSelectBeginning = (content: string) => {
    setSelectedBeginning(content);
    setStoryContent([content]);
    setPrompts([]);
    setError(null);
    handleGeneratePrompts(content);
  };

  // 重置故事
  const handleReset = () => {
    setSelectedBeginning(null);
    setStoryContent([]);
    setPrompts([]);
    setError(null);
    setShowHistory(false);
  };

  // 生成提示选项
  const handleGeneratePrompts = async (content: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      const generatedPrompts = await generatePrompts(content);
      setPrompts(generatedPrompts);
    } catch (error) {
      setError("生成提示选项失败，请重试");
      console.error("生成提示选项失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 选择提示继续故事
  const handleSelectPrompt = async (selectedPrompt: string) => {
    try {
      setIsGenerating(true);
      setError(null);

      // 记录当前的提示，但不直接显示在故事中
      const currentPrompt = selectedPrompt;

      // 确保我们使用完整的故事内容，保持连贯性
      // 保存当前故事内容
      const currentStory = storyContent.join("\n\n");

      // 调用API继续故事，传递当前故事内容和选定的提示
      const newContent = await continueStory(currentStory, currentPrompt);

      // 检查最后一个段落是否有未完成的句子
      const lastParagraph = storyContent[storyContent.length - 1];
      const lastCharOfLastParagraph = lastParagraph[lastParagraph.length - 1];
      const isCompleteEnding = /[。！？.!?]$/.test(lastCharOfLastParagraph);

      // 检查重复内容：查看新内容的开头是否与原内容的结尾重复
      const lastFewChars = lastParagraph.slice(-30).trim(); // 获取最后30个字符
      const firstFewChars = newContent.slice(0, 40).trim(); // 获取开头40个字符

      // 如果有明显重复，截断重复部分
      let processedNewContent = newContent;
      if (lastFewChars && firstFewChars) {
        // 检查重复的片段
        for (let i = 5; i <= Math.min(lastFewChars.length, 20); i++) {
          const endPart = lastFewChars.slice(-i);
          if (firstFewChars.startsWith(endPart)) {
            // 发现重复，移除新内容开头的重复部分
            processedNewContent = newContent.slice(endPart.length);
            console.log(`检测到重复内容，移除了${endPart.length}个字符`);
            break;
          }
        }
      }

      // 判断新内容是否为上一句的延续
      // 在中文语境下，如果上一句没有完整结束（没有句号等标点），则认为新内容是其延续
      // 不再检查首字符是否为小写或标点符号，只要上一句没有完整结束，就视为连续内容
      if (!isCompleteEnding) {
        // 更新最后一个段落
        const updatedStoryContent = [...storyContent];
        updatedStoryContent[updatedStoryContent.length - 1] = lastParagraph + " " + processedNewContent;
        setStoryContent(updatedStoryContent);
      } else {
        // 只添加新生成的内容到故事数组，不添加提示信息
        // 防止故事不连贯和提示信息泄露
        setStoryContent([...storyContent, processedNewContent]);
      }

      // 生成新的提示选项
      handleGeneratePrompts([...storyContent, processedNewContent].join("\n\n"));
    } catch (error) {
      setError("继续故事失败，请重试");
      console.error("继续故事失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 切换主题
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // 切换历史记录显示
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // 从历史记录中选择故事
  const handleSelectFromHistory = (story: StoredStory) => {
    setSelectedBeginning(story.content[0]);
    setStoryContent(story.content);
    setShowHistory(false);
    // 生成新的提示选项
    handleGeneratePrompts(story.content.join("\n\n"));
  };

  return (
    <main className="flex flex-col w-full h-screen overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 py-3 border-b bg-background/90 backdrop-blur-sm border-border/40">
        <div className="flex items-center justify-between px-10 mx-auto">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">AI互动小说</span>
          </div>

          <div className="flex gap-4">
            {selectedBeginning && (
              <Button variant="outline" onClick={handleReset} className="transition-all shadow-sm hover:shadow-md">
                <HomeIcon className="w-5 h-5 mr-2" />
                重新开始
              </Button>
            )}

            <Button variant="outline" onClick={toggleHistory} className={`shadow-sm hover:shadow-md transition-all cursor-pointer ${showHistory ? "bg-muted text-primary" : ""}`}>
              <History className="w-5 h-5 mr-2" />
              历史
            </Button>

            <Button variant="outline" onClick={toggleTheme} className="transition-all shadow-sm cursor-pointer hover:shadow-md">
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col flex-1 w-full px-10 mx-auto overflow-hidden">
        {/* 错误提示 */}
        {error && (
          <Card className="mb-4 shadow-md border-destructive bg-destructive/10 animate-shake">
            <CardContent className="p-4 font-medium text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* 内容主体 */}
        <div className="flex flex-col items-center w-full h-full overflow-hidden">
          {showHistory && <StoryHistory onSelectStory={handleSelectFromHistory} onClose={() => setShowHistory(false)} />}

          {!selectedBeginning && !showHistory && (
            <div className="w-full mx-auto mb-8 text-center">
              <h1 className="pb-2 text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-secondary to-primary bg-clip-text">开始你的冒险故事</h1>
              <p className="mx-auto mt-3 text-lg text-muted-foreground">创建专属故事，每一个选择都将引领你走向不同的结局</p>
            </div>
          )}

          {!selectedBeginning && !showHistory && <StoryBeginning onSelectBeginning={handleSelectBeginning} />}

          {selectedBeginning && !showHistory && <StoryInterface storyContent={storyContent} prompts={prompts} isGenerating={isGenerating} onGeneratePrompts={handleGeneratePrompts} onSelectPrompt={handleSelectPrompt} />}
        </div>
      </div>

      <footer className="py-3 border-t border-border/40 bg-background/90 backdrop-blur-sm">
        <div className="px-10 text-center text-muted-foreground">
          <p>© 2025 AI互动小说 版权所有</p>
        </div>
      </footer>
    </main>
  );
}
