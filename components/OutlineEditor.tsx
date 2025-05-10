"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Loader2, ListTree, BookText, Plus, Trash2, MoveDown, MoveUp } from "lucide-react";

interface OutlineItem {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface OutlineEditorProps {
  storyId: string;
  initialOutline?: string; // JSON格式的大纲结构
  onSave: (outline: string) => Promise<void>; // 保存大纲为JSON字符串
}

export function OutlineEditor({ storyId, initialOutline, onSave }: OutlineEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("structured");
  const [freeformContent, setFreeformContent] = useState("");
  const [structuredOutline, setStructuredOutline] = useState<OutlineItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");

  // 初始化大纲内容
  useEffect(() => {
    if (initialOutline) {
      try {
        // 尝试解析为结构化大纲
        const parsedOutline = JSON.parse(initialOutline);

        if (Array.isArray(parsedOutline)) {
          setStructuredOutline(parsedOutline);
          // 同时更新自由格式内容，以便在两种视图之间切换
          setFreeformContent(convertStructuredToFreeform(parsedOutline));
        } else {
          // 如果不是数组，可能是自由格式的文本
          setFreeformContent(initialOutline);
          setStructuredOutline([]); // 清空结构化大纲
        }
      } catch (error) {
        // 如果解析失败，假设它是自由格式的文本
        console.error("解析大纲失败:", error);
        setFreeformContent(initialOutline);
        setStructuredOutline([]);
      }
    }
  }, [initialOutline]);

  // 转换结构化大纲为自由格式文本
  const convertStructuredToFreeform = (items: OutlineItem[]): string => {
    return items
      .sort((a, b) => a.order - b.order)
      .map((item) => `## ${item.title}\n${item.description}`)
      .join("\n\n");
  };

  // 保存大纲
  const handleSave = async () => {
    try {
      setIsLoading(true);

      // 根据当前活动的视图选择要保存的内容
      let outlineToSave: string;

      if (activeTab === "structured") {
        // 保存结构化大纲
        outlineToSave = JSON.stringify(structuredOutline);
      } else {
        // 保存自由格式内容
        outlineToSave = freeformContent;
      }

      await onSave(outlineToSave);
    } catch (error) {
      console.error("保存大纲失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新大纲项目
  const addOutlineItem = () => {
    if (!newItemTitle.trim()) return;

    const newId = `outline-${Date.now()}`;
    const newOrder = structuredOutline.length > 0 ? Math.max(...structuredOutline.map((item) => item.order)) + 1 : 0;

    setStructuredOutline([
      ...structuredOutline,
      {
        id: newId,
        title: newItemTitle,
        description: "",
        order: newOrder,
      },
    ]);

    setNewItemTitle("");
  };

  // 更新大纲项目
  const updateOutlineItem = (id: string, field: "title" | "description", value: string) => {
    setStructuredOutline(structuredOutline.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // 删除大纲项目
  const deleteOutlineItem = (id: string) => {
    setStructuredOutline(structuredOutline.filter((item) => item.id !== id));
  };

  // 移动大纲项目
  const moveOutlineItem = (id: string, direction: "up" | "down") => {
    const currentItems = [...structuredOutline].sort((a, b) => a.order - b.order);
    const itemIndex = currentItems.findIndex((item) => item.id === id);

    if (itemIndex === -1) return;

    if (direction === "up" && itemIndex > 0) {
      // 向上移动
      const temp = currentItems[itemIndex].order;
      currentItems[itemIndex].order = currentItems[itemIndex - 1].order;
      currentItems[itemIndex - 1].order = temp;
    } else if (direction === "down" && itemIndex < currentItems.length - 1) {
      // 向下移动
      const temp = currentItems[itemIndex].order;
      currentItems[itemIndex].order = currentItems[itemIndex + 1].order;
      currentItems[itemIndex + 1].order = temp;
    }

    setStructuredOutline([...currentItems]);
  };

  // 切换到自由文本模式时更新内容
  const handleTabChange = (value: string) => {
    if (value === "freeform" && activeTab === "structured") {
      // 从结构化切换到自由格式
      setFreeformContent(convertStructuredToFreeform(structuredOutline));
    }
    // 从自由格式切换到结构化不做处理，因为解析复杂度高

    setActiveTab(value);
  };

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-primary" />
            故事大纲
          </CardTitle>
          <Button onClick={handleSave} disabled={isLoading} size="sm" className="h-8 gap-1">
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                保存大纲
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="structured" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="structured" className="flex items-center gap-1.5 flex-1">
              <ListTree className="w-4 h-4" />
              结构化大纲
            </TabsTrigger>
            <TabsTrigger value="freeform" className="flex items-center gap-1.5 flex-1">
              <BookText className="w-4 h-4" />
              自由编辑
            </TabsTrigger>
          </TabsList>

          <TabsContent value="structured" className="mt-0">
            <div className="space-y-4">
              {/* 添加新项目 */}
              <div className="flex gap-2">
                <Input placeholder="新的大纲章节标题" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} className="flex-1" />
                <Button onClick={addOutlineItem} disabled={!newItemTitle.trim()} variant="outline" size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  添加
                </Button>
              </div>

              {/* 大纲项目列表 */}
              <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-4">
                  {structuredOutline
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <Card key={item.id} className="border shadow-sm border-border/60">
                        <CardHeader className="p-3 pb-0">
                          <div className="flex items-start gap-2">
                            <Input value={item.title} onChange={(e) => updateOutlineItem(item.id, "title", e.target.value)} className="text-sm font-medium" placeholder="章节标题" />
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => moveOutlineItem(item.id, "up")} className="h-8 w-8 p-0" title="向上移动">
                                <MoveUp className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => moveOutlineItem(item.id, "down")} className="h-8 w-8 p-0" title="向下移动">
                                <MoveDown className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteOutlineItem(item.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10" title="删除">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3">
                          <Textarea value={item.description} onChange={(e) => updateOutlineItem(item.id, "description", e.target.value)} placeholder="章节内容描述" className="min-h-24 text-sm" />
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="freeform" className="mt-0">
            <Textarea value={freeformContent} onChange={(e) => setFreeformContent(e.target.value)} placeholder="在这里自由编辑你的大纲，你可以使用Markdown格式。" className="w-full min-h-[50vh]" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
