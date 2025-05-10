"use client";

import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PencilLine, Sparkles, ChevronRight, RefreshCw, Brain } from "lucide-react";
import { generatePrompts } from "@/lib/api-service";
import { useAuth } from "@clerk/nextjs";

interface StoryBeginningProps {
  onSelectBeginning: (content: string) => void;
}

interface StoryOption {
  title: string;
  description: string;
  content: string;
  icon: React.ReactNode;
}

export function StoryBeginning({ onSelectBeginning }: StoryBeginningProps) {
  const [customStory, setCustomStory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBeginnings, setGeneratedBeginnings] = useState<string[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoaded, isSignedIn } = useAuth();

  // 当切换到自定义故事时，自动聚焦文本框
  useEffect(() => {
    if (showCustom && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showCustom]);

  // 预设的故事开头选项
  const storyOptions: StoryOption[] = [
    {
      title: "奇幻冒险",
      description: "踏入一个充满魔法和神秘生物的世界",
      content: "在遥远的艾泽拉大陆，一个名叫莱恩的年轻法师学徒意外发现了一本被尘封千年的古老魔法书。当他小心翼翼地翻开第一页时，书中突然闪烁出奇异的蓝色光芒，神秘的符文在空中舞动。莱恩感到一股神秘力量涌入体内，他的手指开始发光，周围的物体缓缓漂浮起来。就在这时，窗外传来一阵急促的敲门声。",
      icon: <Sparkles className="w-12 h-12 text-amber-500" />,
    },
    {
      title: "科幻未来",
      description: "探索高科技世界中的惊险与挑战",
      content:
        '2157年的新上海，天空中飞行器川流不息，全息广告投影在每一座摩天大楼之间闪烁。赵明作为"深梦"公司的数据安全专家，已经连续工作36小时，追踪一个几乎不可能存在的数据泄露。当他终于锁定入侵源头，发现那竟是来自公司内部最高权限的访问记录。就在他准备上报这一发现的那一刻，办公室的智能系统突然宣布全面锁定，紧急协议启动。',
      icon: <Brain className="w-12 h-12 text-cyan-500" />,
    },
  ];

  // 生成新的故事开头
  const handleGenerateBeginnings = async () => {
    try {
      setIsGenerating(true);
      // 使用一个提示来生成新的故事开头
      const prompt = "请为我创作一个引人入胜的小说开头，大约100-150字";
      const beginnings = await generatePrompts(prompt);
      setGeneratedBeginnings(beginnings.map((b) => b.replace(/^["']|["']$/g, "")));
    } catch (error) {
      console.error("生成故事开头失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 选择一个故事开头
  const handleSelectOption = (content: string) => {
    onSelectBeginning(content);
  };

  // 提交自定义故事
  const handleSubmitCustomStory = () => {
    if (customStory.trim()) {
      onSelectBeginning(customStory);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      {!showCustom ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 预设的故事选项 */}
          {storyOptions.map((option, index) => (
            <Card key={index} className="overflow-hidden transition-all border-2 shadow-lg h-72 hover:shadow-xl hover:border-primary/50 border-border/60">
              <CardHeader className="p-6 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{option.title}</CardTitle>
                    <CardDescription className="mt-1">{option.description}</CardDescription>
                  </div>
                  <div className="p-2 rounded-full bg-background/80">{option.icon}</div>
                </div>
              </CardHeader>
              <CardContent className="p-6 h-28 line-clamp-4">
                <p className="text-base">{option.content.substring(0, 110)}...</p>
              </CardContent>
              <CardFooter className="p-6 bg-muted/20">
                <Button className="w-full gap-2" onClick={() => handleSelectOption(option.content)}>
                  选择这个开头
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}

          {/* 生成的故事开头 */}
          {generatedBeginnings.map((beginning, index) => (
            <Card key={`generated-${index}`} className="overflow-hidden transition-all border-2 shadow-lg h-72 hover:shadow-xl hover:border-primary/50 border-border/60">
              <CardHeader className="p-6 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">AI生成故事 #{index + 1}</CardTitle>
                    <CardDescription className="mt-1">AI为你创作的独特故事开头</CardDescription>
                  </div>
                  <div className="p-2 rounded-full bg-background/80">
                    <Sparkles className="w-12 h-12 text-purple-500" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 h-28 line-clamp-4">
                <p className="text-base">{beginning.substring(0, 110)}...</p>
              </CardContent>
              <CardFooter className="p-6 bg-muted/20">
                <Button className="w-full gap-2" onClick={() => handleSelectOption(beginning)}>
                  选择这个开头
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}

          {/* 自定义故事开头选项 */}
          <Card className="overflow-hidden transition-all border-2 shadow-lg h-72 hover:shadow-xl hover:border-primary/50 border-border/60">
            <CardHeader className="p-6 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">自定义故事</CardTitle>
                  <CardDescription className="mt-1">创作你自己的故事开头</CardDescription>
                </div>
                <div className="p-2 rounded-full bg-background/80">
                  <PencilLine className="w-12 h-12 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-6 h-28">
              <p className="text-base text-center">创建你自己的故事开头，让AI根据你的想法继续创作</p>
            </CardContent>
            <CardFooter className="p-6 bg-muted/20">
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowCustom(true)}>
                开始创作
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* AI生成故事按钮 */}
          <Card className="overflow-hidden transition-all border-2 shadow-lg h-72 hover:shadow-xl hover:border-primary/50 border-border/60">
            <CardHeader className="p-6 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">AI生成故事</CardTitle>
                  <CardDescription className="mt-1">让AI为你创作新的故事开头</CardDescription>
                </div>
                <div className="p-2 rounded-full bg-background/80">
                  <Brain className="w-12 h-12 text-emerald-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-6 h-28">
              {isLoaded && !isSignedIn ? <p className="text-base text-center text-muted-foreground">登录后可以使用AI生成更多独特的故事开头</p> : <p className="text-base text-center">不喜欢现有的选项？让AI为你生成全新的故事开头</p>}
            </CardContent>
            <CardFooter className="p-6 bg-muted/20">
              <Button variant="outline" className="w-full gap-2" onClick={handleGenerateBeginnings} disabled={isGenerating || (isLoaded && !isSignedIn && generatedBeginnings.length >= 1)}>
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    生成新故事
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <Card className="border-2 shadow-xl border-primary/30">
          <CardHeader className="p-6 bg-muted/30">
            <CardTitle className="text-2xl font-bold">创作你的故事</CardTitle>
            <CardDescription>输入你想要的故事开头（100-300字左右），AI将根据你的开头继续创作</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea ref={textareaRef} placeholder="从前，在一个遥远的王国..." value={customStory} onChange={(e) => setCustomStory(e.target.value)} className="min-h-36 text-base" />
          </CardContent>
          <CardFooter className="flex justify-between gap-4 p-6 bg-muted/20">
            <Button variant="outline" onClick={() => setShowCustom(false)}>
              返回选择
            </Button>
            <Button onClick={handleSubmitCustomStory} disabled={!customStory.trim()}>
              开始我的故事
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
