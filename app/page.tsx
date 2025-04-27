"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoryBeginning } from "@/components/StoryBeginning";
import { StoryContent } from "@/components/StoryContent";
import { PromptSelector } from "@/components/PromptSelector";
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
      const currentStory = storyContent.join("\n\n");
      const newContent = await continueStory(currentStory, selectedPrompt);
      setStoryContent([...storyContent, selectedPrompt, newContent]);
      // 生成新的提示选项
      handleGeneratePrompts([...storyContent, selectedPrompt, newContent].join("\n\n"));
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
    <main className="flex flex-col w-full min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* 导航栏 */}
      <header className="sticky top-0 z-10 py-4 mb-10 border-b bg-background/90 backdrop-blur-sm border-border/40">
        <div className="flex items-center justify-between px-10 mx-auto">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">AI互动小说</span>
          </div>

          <div className="flex gap-4">
            {selectedBeginning && (
              <Button variant="outline" onClick={handleReset} className="transition-all shadow-sm hover:shadow-md">
                <HomeIcon className="w-5 h-5 mr-2" />
                重新开始
              </Button>
            )}

            <Button variant="outline" onClick={toggleHistory} className={`shadow-sm hover:shadow-md transition-all ${showHistory ? "bg-muted text-primary" : ""}`}>
              <History className="w-5 h-5 mr-2" />
              历史
            </Button>

            <Button variant="outline" onClick={toggleTheme} className="transition-all shadow-sm hover:shadow-md">
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full px-10 mx-auto mb-10">
        {/* 错误提示 */}
        {error && (
          <Card className="mb-8 shadow-md border-destructive bg-destructive/10 animate-shake">
            <CardContent className="p-4 font-medium text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* 内容主体 */}
        <div className="flex flex-col items-center w-full">
          {showHistory && <StoryHistory onSelectStory={handleSelectFromHistory} onClose={() => setShowHistory(false)} />}

          {!selectedBeginning && !showHistory && (
            <div className="w-full mx-auto mb-12 text-center">
              <h1 className="pb-4 text-5xl font-bold tracking-tight text-transparent bg-gradient-to-r from-secondary to-primary bg-clip-text">开始你的冒险故事</h1>
              <p className="mx-auto mt-5 text-xl text-muted-foreground">创建专属故事，每一个选择都将引领你走向不同的结局</p>
            </div>
          )}

          {!selectedBeginning && !showHistory && <StoryBeginning onSelectBeginning={handleSelectBeginning} />}

          {selectedBeginning && !showHistory && (
            <>
              <div className="mb-8">
                <StoryContent storyContent={storyContent} onGeneratePrompts={handleGeneratePrompts} isGenerating={isGenerating} />
              </div>
              <PromptSelector prompts={prompts} onSelectPrompt={handleSelectPrompt} isGenerating={isGenerating} />
            </>
          )}
        </div>
      </div>

      <footer className="py-6 border-t border-border/40 bg-background/90 backdrop-blur-sm">
        <div className="px-10 text-center text-muted-foreground">
          <p>© 2023 AI互动小说 版权所有</p>
        </div>
      </footer>
    </main>
  );
}
