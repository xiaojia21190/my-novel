"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { StoryNavigation } from "@/components/StoryNavigation";
import { OutlineEditor } from "@/components/OutlineEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Sparkles, ListTree, BookText } from "lucide-react";
import { getStory, updateStoryOutline, generateOutline } from "@/lib/api-service";
import { toast } from "sonner";

interface Story {
  id: string;
  title: string;
  outline?: string | null;
  content?: string | null;
  summary?: string | null;
}

export default function OutlinePage() {
  const { id } = useParams() as { id: string };
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  // 获取故事数据
  useEffect(() => {
    const fetchStory = async () => {
      try {
        setIsLoading(true);
        const storyData = await getStory(id);
        setStory(storyData);
      } catch (error) {
        console.error("获取故事数据失败:", error);
        toast.error("加载故事数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  // 保存大纲
  const handleSaveOutline = async (outline: string) => {
    if (!story) return;

    try {
      setIsSaving(true);
      await updateStoryOutline(id, outline);
      setStory({ ...story, outline });
      toast.success("大纲已保存");
    } catch (error) {
      console.error("保存大纲失败:", error);
      toast.error("保存大纲失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 使用AI生成大纲
  const handleGenerateOutline = async () => {
    if (!story) return;

    try {
      setIsGenerating(true);

      // 构建提示，如果有故事内容或摘要，则使用它们
      let prompt = `为小说"${story.title}"生成详细的故事大纲`;
      if (story.content) {
        prompt += `，基于以下故事内容:\n${story.content.substring(0, 2000)}...`;
      } else if (story.summary) {
        prompt += `，基于以下故事摘要:\n${story.summary}`;
      }

      const generatedOutline = await generateOutline(id, prompt);

      // 更新故事大纲
      setStory({ ...story, outline: generatedOutline });
      toast.success("AI已生成故事大纲");
    } catch (error) {
      console.error("生成大纲失败:", error);
      toast.error("生成大纲失败");
    } finally {
      setIsGenerating(false);
    }
  };

  // 大纲生成器提示
  const OutlineGeneratorPrompt = () => (
    <Card className="border-dashed shadow-sm">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <ListTree className="w-12 h-12 mb-4 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">使用AI生成故事大纲</h3>
        <p className="mb-4 text-muted-foreground">AI可以根据你的故事内容或摘要生成结构化的故事大纲，帮助你规划故事发展。</p>
        <Button onClick={handleGenerateOutline} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI生成大纲
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen">
      {/* 左侧导航 */}
      <div className="w-64 shrink-0">
        <StoryNavigation storyId={id} storyTitle={story?.title} />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            {/* 标题区域 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">故事大纲</h1>
                <p className="text-muted-foreground">规划和组织你的故事结构</p>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList>
                  <TabsTrigger value="editor" className="flex items-center gap-1.5">
                    <ListTree className="w-4 h-4" />
                    编辑器
                  </TabsTrigger>
                  <TabsTrigger value="generator" className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    AI生成器
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <hr className="mb-6 border-t border-border/40" />

            {/* 内容区域 */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">加载故事大纲中...</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="editor" className="mt-0">
                  <OutlineEditor storyId={id} initialOutline={story?.outline || undefined} onSave={handleSaveOutline} />
                </TabsContent>
                <TabsContent value="generator" className="mt-0">
                  <OutlineGeneratorPrompt />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
