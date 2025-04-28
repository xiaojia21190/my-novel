"use client";

import { useState, useEffect } from "react";
import { StoryContent } from "@/components/StoryContent";
import { PromptSelector } from "@/components/PromptSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2 } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface StoryInterfaceProps {
  storyContent: string[];
  prompts: string[];
  isGenerating: boolean;
  onGeneratePrompts: (content: string) => void;
  onSelectPrompt: (prompt: string) => void;
}

export function StoryInterface({ storyContent, prompts, isGenerating, onGeneratePrompts, onSelectPrompt }: StoryInterfaceProps) {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  // 检测窗口大小变化，决定是否使用移动布局
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024); // 1024px 是大多数平板电脑的断点
    };

    // 初始检查
    checkIfMobile();

    // 监听窗口大小变化
    window.addEventListener("resize", checkIfMobile);

    // 清理函数
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // 移动布局：垂直堆叠
  if (isMobile) {
    return (
      <div className="flex flex-col w-full h-full space-y-4 overflow-hidden animate-fadeIn">
        {/* 故事内容 */}
        <StoryContent storyContent={storyContent} onGeneratePrompts={onGeneratePrompts} isGenerating={isGenerating} />

        {/* 故事选项 */}
        {prompts.length > 0 && (
          <Card className="overflow-hidden border-2 shadow-xl border-secondary/30">
            <CardHeader className="py-3 border-b bg-gradient-to-r from-secondary/20 to-primary/10 border-border/30">
              <CardTitle className="flex items-center justify-center gap-3 text-xl text-center">
                <Wand2 className="w-5 h-5 text-secondary" />
                选择故事走向
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-auto bg-gradient-to-b from-background to-muted/20" style={{ maxHeight: "30vh" }}>
              <PromptSelector prompts={prompts} onSelectPrompt={onSelectPrompt} isGenerating={isGenerating} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // 桌面布局：左右分栏
  return (
    <div className="w-full h-full overflow-hidden animate-fadeIn">
      <div className="flex flex-row h-full gap-4 overflow-hidden">
        {/* 左侧 - 故事内容 */}
        <div className="w-2/3 h-full overflow-hidden">
          <StoryContent storyContent={storyContent} onGeneratePrompts={onGeneratePrompts} isGenerating={isGenerating} />
        </div>

        {/* 右侧 - 故事选项或空白提示 */}
        <div className="w-1/3 h-full overflow-hidden">
          {prompts.length > 0 ? (
            <Card className="flex flex-col h-full overflow-hidden border-2 shadow-xl border-secondary/30">
              <CardHeader className="py-3 border-b shrink-0 bg-gradient-to-r from-secondary/20 to-primary/10 border-border/30">
                <CardTitle className="flex items-center justify-center gap-3 text-xl text-center">
                  <Wand2 className="w-5 h-5 text-secondary" />
                  选择故事走向
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-4 overflow-auto bg-gradient-to-b from-background to-muted/20">
                <PromptSelector prompts={prompts} onSelectPrompt={onSelectPrompt} isGenerating={isGenerating} />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full overflow-hidden border-2 border-dashed shadow-lg border-muted-foreground/30">
              <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Sparkles className="w-10 h-10 mb-3 text-secondary/50" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  点击"生成后续提示"
                  <br />
                  生成故事发展选项
                </h3>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
