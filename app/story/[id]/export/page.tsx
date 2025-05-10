"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, ArrowLeft, BookOpen } from "lucide-react";
import { getStory, getChapters, getStoryCharacters, getOutline, Character } from "@/lib/api-service";
import { toast } from "sonner";

type ExportFormat = "pdf" | "epub" | "txt" | "html";

export default function ExportStoryPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [includeCharacters, setIncludeCharacters] = useState(true);
  const [includeOutline, setIncludeOutline] = useState(false);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyPreview, setStoryPreview] = useState("");
  const [charactersPreview, setCharactersPreview] = useState<Character[]>([]);
  const [outlinePreview, setOutlinePreview] = useState("");

  useEffect(() => {
    const loadStoryData = async () => {
      setIsLoading(true);
      try {
        // 并行获取所有需要的数据
        const [story, chapters, characters, outline] = await Promise.all([getStory(storyId), getChapters(storyId), getStoryCharacters(storyId), getOutline(storyId)]);

        setStoryTitle(story.title);

        // 设置正文预览
        const chapterContent = chapters
          .sort((a, b) => a.order - b.order)
          .map((ch) => `# ${ch.title}\n\n${ch.content?.substring(0, 200)}...`)
          .join("\n\n");
        setStoryPreview(chapterContent || "故事还没有章节内容");

        // 设置角色预览
        setCharactersPreview(characters || []);

        // 设置大纲预览
        setOutlinePreview(outline || "故事还没有大纲");
      } catch (error) {
        console.error("加载故事数据失败:", error);
        toast.error("加载故事数据失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    loadStoryData();
  }, [storyId]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/user/story/${storyId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          includeCharacters,
          includeOutline,
        }),
      });

      if (!response.ok) {
        throw new Error("导出失败");
      }

      // 获取文件名
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `${storyTitle}.${exportFormat}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // 处理不同格式的导出
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("故事导出成功！");
    } catch (error) {
      console.error("导出故事失败:", error);
      toast.error("导出故事失败，请稍后重试");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 mb-2 animate-spin" />
        <p>加载故事数据...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 mx-auto">
      <div className="mb-4">
        <Link href={`/story/${storyId}`} className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>返回故事</span>
        </Link>
      </div>

      <h1 className="mb-1 text-3xl font-bold tracking-tight">{storyTitle}</h1>
      <p className="mb-6 text-muted-foreground">导出您的故事作品</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>导出选项</CardTitle>
              <CardDescription>选择导出格式和内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="format">导出格式</Label>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="选择格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF文档</SelectItem>
                    <SelectItem value="epub">EPUB电子书</SelectItem>
                    <SelectItem value="txt">纯文本</SelectItem>
                    <SelectItem value="html">HTML网页</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>包含内容</Label>
                <div className="flex items-center pt-1 space-x-2">
                  <Checkbox id="include-characters" checked={includeCharacters} onCheckedChange={(checked: boolean) => setIncludeCharacters(checked)} />
                  <Label htmlFor="include-characters" className="cursor-pointer">
                    包含角色信息
                  </Label>
                </div>
                <div className="flex items-center pt-1 space-x-2">
                  <Checkbox id="include-outline" checked={includeOutline} onCheckedChange={(checked: boolean) => setIncludeOutline(checked)} />
                  <Label htmlFor="include-outline" className="cursor-pointer">
                    包含故事大纲
                  </Label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExport} disabled={isExporting} className="w-full">
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    导出故事
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>导出格式说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>PDF文档</strong>：适合打印或阅读，保留完整排版
              </p>
              <p>
                <strong>EPUB电子书</strong>：适合在电子书阅读器上阅读
              </p>
              <p>
                <strong>纯文本</strong>：简单的文本文件，适合二次编辑
              </p>
              <p>
                <strong>HTML网页</strong>：适合在浏览器中查看或发布在网站上
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>预览</CardTitle>
              <CardDescription>故事内容预览</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] overflow-auto">
              <Tabs defaultValue="content">
                <TabsList>
                  <TabsTrigger value="content">正文预览</TabsTrigger>
                  {includeCharacters && <TabsTrigger value="characters">角色信息</TabsTrigger>}
                  {includeOutline && <TabsTrigger value="outline">故事大纲</TabsTrigger>}
                </TabsList>
                <TabsContent value="content" className="mt-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h1>{storyTitle}</h1>
                    <div className="whitespace-pre-line">{storyPreview}</div>
                  </div>
                </TabsContent>
                {includeCharacters && (
                  <TabsContent value="characters" className="mt-4">
                    {charactersPreview.length > 0 ? (
                      <div className="prose dark:prose-invert max-w-none">
                        <h2>角色列表</h2>
                        {charactersPreview.map((character) => (
                          <div key={character.id} className="mb-4">
                            <h3>{character.name}</h3>
                            <p>{character.description || "无描述"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                        <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                        <p>故事中还没有角色</p>
                      </div>
                    )}
                  </TabsContent>
                )}
                {includeOutline && (
                  <TabsContent value="outline" className="mt-4">
                    <div className="prose dark:prose-invert max-w-none">
                      <h2>故事大纲</h2>
                      <div className="whitespace-pre-line">{outlinePreview}</div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
