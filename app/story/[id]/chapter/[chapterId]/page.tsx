"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getChapter, getChapters, updateChapter, Chapter, generateCoherentChapter } from "@/lib/api-service";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, RefreshCw, Sparkles } from "lucide-react";
import { CoherenceChecker } from "@/components/CoherenceChecker";
import { EnhancedRichTextEditor } from "@/components/ui/enhanced-rich-text-editor";
import { AIWritingAssistant } from "@/components/ui/ai-writing-assistant";
import { formatHtmlForStorage, formatStoredContentToHtml, isHtmlContent } from "@/components/ContentFormatter";
import { toast } from "sonner";

export default function ChapterEdit() {
  const params = useParams();
  const storyId = params.id as string;
  const chapterId = params.chapterId as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [previousChapter, setPreviousChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");

  // 加载章节数据
  useEffect(() => {
    const loadChapterData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取当前章节
        const chapterData = await getChapter(storyId, chapterId);
        setChapter(chapterData);
        setTitle(chapterData.title);

        // 确保内容以 HTML 格式加载到编辑器
        setContent(formatStoredContentToHtml(chapterData.content));

        setSummary(chapterData.summary || "");
        setNotes(chapterData.notes || "");

        // 获取所有章节，并找到前一章
        const chapters = await getChapters(storyId);
        // 根据顺序找到前一章
        const sorted = chapters.sort((a, b) => a.order - b.order);
        const currentIndex = sorted.findIndex((c) => c.id === chapterId);

        if (currentIndex > 0) {
          const prevChapter = sorted[currentIndex - 1];
          // 格式化前一章的内容，用于显示
          if (prevChapter.content && isHtmlContent(prevChapter.content)) {
            setPreviousChapter({
              ...prevChapter,
              // 不修改原始内容
            });
          } else {
            setPreviousChapter(prevChapter);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载章节失败");
        console.error("加载章节失败:", err);
      } finally {
        setLoading(false);
      }
    };

    if (storyId && chapterId) {
      loadChapterData();
    }
  }, [storyId, chapterId]);

  // 保存章节
  const handleSave = async () => {
    if (!storyId || !chapterId) return;

    try {
      setSaving(true);
      setError(null);

      // 确保 HTML 内容以正确格式保存
      const formattedContent = formatHtmlForStorage(content);

      await updateChapter(storyId, chapterId, {
        title,
        content: formattedContent,
        summary,
        notes,
      });

      // 更新本地数据
      if (chapter) {
        setChapter({
          ...chapter,
          title,
          content: formattedContent,
          summary,
          notes,
        });
      }

      toast.success("章节保存成功");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存章节失败");
      console.error("保存章节失败:", err);
      toast.error("保存章节失败");
    } finally {
      setSaving(false);
    }
  };

  // 自动保存内容的处理函数
  const handleAutoSave = async (contentToSave: string) => {
    if (!storyId || !chapterId) return;

    try {
      // 确保 HTML 内容以正确格式保存
      const formattedContent = formatHtmlForStorage(contentToSave);

      await updateChapter(storyId, chapterId, {
        title,
        content: formattedContent,
        summary,
        notes,
      });

      // 更新本地数据但不显示toast，以免干扰用户
      if (chapter) {
        setChapter({
          ...chapter,
          title,
          content: formattedContent,
          summary,
          notes,
        });
      }
      return Promise.resolve();
    } catch (error) {
      console.error("自动保存失败:", error);
      return Promise.reject(error);
    }
  };

  // 应用连贯性修复建议
  const handleApplySuggestion = (suggestion: string) => {
    // 这里简单地将建议附加到笔记中，实际应用中可以做更复杂的处理
    setNotes(notes ? `${notes}\n\n连贯性建议: ${suggestion}` : `连贯性建议: ${suggestion}`);
  };

  // 处理 AI 写作建议
  const handleApplyAISuggestion = (suggestion: string) => {
    if (selectedText && content) {
      // 用 AI 生成的建议替换所选文本
      setContent(content.replace(selectedText, suggestion));
      setSelectedText("");
    }
  };

  // 捕获编辑器中的选中文本
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("keyup", handleTextSelection);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("keyup", handleTextSelection);
    };
  }, [handleTextSelection]);

  // 生成连贯章节内容
  const handleGenerateCoherentContent = async () => {
    if (!previousChapter) {
      setError("没有上一章节，无法生成连贯内容");
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const generatedContent = await generateCoherentChapter(storyId, previousChapter.id, `请根据上一章的内容，为标题为"${title}"的章节生成连贯的内容。${summary ? `章节概要: ${summary}` : ""}`);

      if (generatedContent) {
        // 如果当前内容为空或用户确认覆盖，则设置新内容
        if (!content || window.confirm("是否用生成的内容替换当前内容？")) {
          // 确保生成的内容转换为 HTML 格式
          setContent(formatStoredContentToHtml(generatedContent));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成内容失败");
      console.error("生成内容失败:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">正在加载章节...</span>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-xl">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="章节标题" className="text-xl font-semibold" />
                <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && <div className="p-3 text-sm text-red-600 rounded-md bg-red-50">{error}</div>}

                <div>
                  <h3 className="mb-2 text-sm font-medium">章节内容</h3>
                  <EnhancedRichTextEditor
                    content={content}
                    onChange={setContent}
                    onSave={handleAutoSave}
                    placeholder="输入章节内容..."
                    className="min-h-[400px]"
                    autoSaveInterval={60000} // 每60秒自动保存一次
                    maxCharacterCount={50000} // 限制字符数，根据实际需求调整
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-medium">章节摘要</h3>
                    <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="章节简短摘要..." className="min-h-[100px] resize-y" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium">作者笔记</h3>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="章节相关笔记..." className="min-h-[100px] resize-y" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div></div>
              <Button onClick={handleGenerateCoherentContent} disabled={generating || !previousChapter} variant="outline">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成连贯内容
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <AIWritingAssistant selectedText={selectedText} onApplySuggestion={handleApplyAISuggestion} />

          {previousChapter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">参考上一章</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto">
                <div className="text-sm opacity-80">
                  <p className="font-medium">{previousChapter.title}</p>
                  <div className="mt-2 line-clamp-6">{previousChapter.summary || previousChapter.content.slice(0, 200) + "..."}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <CoherenceChecker storyId={storyId} chapterId={chapterId} content={content} onApplySuggestion={handleApplySuggestion} />
        </div>
      </div>
    </div>
  );
}
