"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Wand, FileText, Users, ListTree, AlertCircle, CheckCircle, Lightbulb, BookOpen, PenTool, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import { useAIAssistant, useAIConsistency, useAIOutline, useAIChapter, useAICharacter } from "@/lib/hooks/useAI";

interface Character {
  id: string;
  name: string;
  description?: string;
}

interface OutlineSection {
  title: string;
  content: string;
}

interface AIAssistantProps {
  storyId: string;
  storyTitle?: string;
  characters?: Character[];
  outlineSections?: OutlineSection[];
  currentChapterId?: string;
  currentChapterContent?: string;
  onApplyContent?: (content: string) => void;
  defaultTab?: string;
  editorContent?: string;
}

export function AIAssistant({ storyId, storyTitle = "", characters = [], outlineSections = [], currentChapterId, currentChapterContent = "", onApplyContent, defaultTab = "creative", editorContent = "" }: AIAssistantProps) {
  // 状态管理
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [result, setResult] = useState("");
  const resultRef = useRef<string>("");

  // 创意辅助选项
  const [selectedAssistanceType, setSelectedAssistanceType] = useState("creative_suggestion");
  const [specificRequest, setSpecificRequest] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState("");

  // 一致性检查选项
  const [consistencyType, setConsistencyType] = useState("all");
  const [consistencyResult, setConsistencyResult] = useState<any>(null);

  // 大纲生成选项
  const [outlineTheme, setOutlineTheme] = useState("");
  const [outlineGenre, setOutlineGenre] = useState("");
  const [outlineNotes, setOutlineNotes] = useState("");

  // 章节生成选项
  const [selectedOutlineSection, setSelectedOutlineSection] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");

  // 角色生成选项
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [generatedCharacter, setGeneratedCharacter] = useState<any>(null);

  // useAI钩子
  const aiAssistant = useAIAssistant({
    onSuccess: (data) => setResult(data),
  });

  const aiConsistency = useAIConsistency({
    onSuccess: (data) => setConsistencyResult(data),
  });

  const aiOutline = useAIOutline({
    onSuccess: (data) => setResult(data),
  });

  const aiChapter = useAIChapter({
    onSuccess: (data) => setResult(data.content || ""),
  });

  const aiCharacter = useAICharacter({
    onSuccess: (description) => {
      setGeneratedCharacter({
        name: characterPrompt.split(" ")[0] || "新角色",
        description,
      });
    },
  });

  // 当默认标签变化时更新激活标签
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // 处理编辑器内容变化
  useEffect(() => {
    if (editorContent) {
      setSelectedText(editorContent);
    }
  }, [editorContent]);

  // 创意辅助功能
  const handleCreativeAssistance = async () => {
    setResult("");
    resultRef.current = "";

    await aiAssistant.execute(storyId, {
      content: currentChapterContent || selectedText,
      assistanceType: selectedAssistanceType,
      specificRequest,
      selectedText,
      characterIds: selectedCharacterIds,
    });
  };

  // 一致性检查功能
  const handleConsistencyCheck = async () => {
    await aiConsistency.execute(storyId, currentChapterContent || selectedText, consistencyType, currentChapterId);
  };

  // 大纲生成功能
  const handleOutlineGeneration = async () => {
    setResult("");
    resultRef.current = "";

    await aiOutline.execute(storyId, outlineTheme, outlineGenre, outlineNotes, false);
  };

  // 章节生成功能
  const handleChapterGeneration = async () => {
    if (!selectedOutlineSection) {
      toast.error("请选择一个大纲章节");
      return;
    }

    setResult("");
    resultRef.current = "";

    await aiChapter.execute(storyId, selectedOutlineSection, chapterTitle, undefined, false);
  };

  // 角色生成功能
  const handleCharacterGeneration = async () => {
    if (!characterPrompt.trim()) {
      toast.error("请输入角色描述提示");
      return;
    }

    await aiCharacter.execute(characterPrompt);
  };

  // 应用生成的内容
  const applyContent = () => {
    if (onApplyContent && result) {
      onApplyContent(result);
      toast.success("已应用AI生成内容");
      setResult("");
      resultRef.current = "";
    }
  };

  // 获取内容类型辅助的类型选项
  const creativeAssistanceTypes = [
    { value: "creative_suggestion", label: "创意建议", icon: <Lightbulb className="w-4 h-4" /> },
    { value: "expand_scene", label: "场景扩展", icon: <BookOpen className="w-4 h-4" /> },
    { value: "dialogue_enhancement", label: "对话优化", icon: <FileText className="w-4 h-4" /> },
    { value: "character_development", label: "角色塑造", icon: <Users className="w-4 h-4" /> },
    { value: "plot_twist", label: "情节转折", icon: <Wand className="w-4 h-4" /> },
    { value: "writing_style", label: "写作风格调整", icon: <PenTool className="w-4 h-4" /> },
  ];

  // 组合加载状态
  const isLoading = aiAssistant.isLoading || aiConsistency.isLoading || aiOutline.isLoading || aiChapter.isLoading || aiCharacter.isLoading;

  return (
    <Card className="shadow-md border-primary/20">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI创作助手
        </CardTitle>
        <CardDescription>智能辅助功能帮你解决创作难题</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="creative" className="flex items-center gap-1.5">
              <Wand className="w-4 h-4" />
              创意辅助
            </TabsTrigger>
            <TabsTrigger value="consistency" className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              一致性检查
            </TabsTrigger>
            <TabsTrigger value="outline" className="flex items-center gap-1.5">
              <ListTree className="w-4 h-4" />
              大纲生成
            </TabsTrigger>
            <TabsTrigger value="chapter" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              章节生成
            </TabsTrigger>
            <TabsTrigger value="character" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              角色生成
            </TabsTrigger>
          </TabsList>

          {/* 创意辅助 */}
          <TabsContent value="creative" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="assistance-type">辅助类型</Label>
                <Select value={selectedAssistanceType} onValueChange={setSelectedAssistanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择辅助类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {creativeAssistanceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="specific-request">具体需求</Label>
                <Textarea id="specific-request" placeholder="请描述你需要AI帮助的具体内容..." value={specificRequest} onChange={(e) => setSpecificRequest(e.target.value)} className="h-20" />
              </div>

              {characters.length > 0 && (
                <div>
                  <Label>相关角色</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {characters.map((char) => (
                      <Button
                        key={char.id}
                        variant={selectedCharacterIds.includes(char.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectedCharacterIds.includes(char.id)) {
                            setSelectedCharacterIds(selectedCharacterIds.filter((id) => id !== char.id));
                          } else {
                            setSelectedCharacterIds([...selectedCharacterIds, char.id]);
                          }
                        }}
                      >
                        {char.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button onClick={handleCreativeAssistance} disabled={isLoading} className="w-full">
                  {aiAssistant.isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {aiAssistant.isLoading ? "生成中..." : "获取AI辅助"}
                </Button>
              </div>
            </div>

            {result && (
              <div className="mt-4 space-y-4">
                <ScrollArea className="h-64 p-4 border rounded-md bg-muted/30">
                  <div className="whitespace-pre-wrap">{result}</div>
                </ScrollArea>

                <Button onClick={applyContent} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  应用AI内容
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 一致性检查 */}
          <TabsContent value="consistency" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="consistency-type">检查类型</Label>
                <Select value={consistencyType} onValueChange={setConsistencyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择检查类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全面检查</SelectItem>
                    <SelectItem value="character">角色一致性</SelectItem>
                    <SelectItem value="plot">情节连贯性</SelectItem>
                    <SelectItem value="setting">设定一致性</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content-to-check">待检查内容</Label>
                <Textarea id="content-to-check" placeholder="输入需要检查的内容..." value={selectedText || currentChapterContent} onChange={(e) => setSelectedText(e.target.value)} className="h-32" />
              </div>

              <Button onClick={handleConsistencyCheck} disabled={isLoading} className="w-full">
                {aiConsistency.isLoading ? "检查中..." : "开始一致性检查"}
              </Button>
            </div>

            {consistencyResult && (
              <div className="pt-4 mt-4 space-y-4 border-t border-border/40">
                <div>
                  <Label className="block mb-2">检查结果</Label>
                  <Card className="bg-muted/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span>一致性得分</span>
                        <span className={`text-lg font-bold ${consistencyResult.score >= 80 ? "text-green-500" : consistencyResult.score >= 60 ? "text-amber-500" : "text-destructive"}`}>{consistencyResult.score}/100</span>
                      </CardTitle>
                      <CardDescription>{consistencyResult.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {consistencyResult.issues && consistencyResult.issues.length > 0 && (
                        <div>
                          <h4 className="mb-1 font-medium text-destructive">发现的问题</h4>
                          <ul className="pl-5 space-y-1 text-sm list-disc">
                            {consistencyResult.issues.map((issue: any, i: number) => (
                              <li key={i} className="text-destructive/90">
                                {issue.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {consistencyResult.suggestions && consistencyResult.suggestions.length > 0 && (
                        <div>
                          <h4 className="mb-1 font-medium text-primary">优势和建议</h4>
                          <ul className="pl-5 space-y-1 text-sm list-disc">
                            {consistencyResult.suggestions.map((suggestion: string, i: number) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 大纲生成 */}
          <TabsContent value="outline" className="space-y-4">
            <Alert className="mb-4 bg-muted/20">
              <AlertDescription>基于你的角色信息自动生成故事大纲，提供主要情节框架和转折点</AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="outline-theme">故事主题</Label>
                <Input id="outline-theme" placeholder="例如：复仇、爱情、成长..." value={outlineTheme} onChange={(e) => setOutlineTheme(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="outline-genre">故事类型</Label>
                <Select value={outlineGenre} onValueChange={setOutlineGenre}>
                  <SelectTrigger id="outline-genre">
                    <SelectValue placeholder="选择故事类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fantasy">奇幻</SelectItem>
                    <SelectItem value="scifi">科幻</SelectItem>
                    <SelectItem value="mystery">悬疑</SelectItem>
                    <SelectItem value="romance">浪漫</SelectItem>
                    <SelectItem value="adventure">冒险</SelectItem>
                    <SelectItem value="thriller">惊悚</SelectItem>
                    <SelectItem value="historical">历史</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="outline-notes">附加说明</Label>
                <Textarea id="outline-notes" placeholder="对故事的其他要求或特殊设定..." value={outlineNotes} onChange={(e) => setOutlineNotes(e.target.value)} className="h-24" />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <div className="text-sm font-medium">可用角色: </div>
                <div className="text-sm text-muted-foreground">{characters.length > 0 ? characters.map((c) => c.name).join(", ") : "未创建角色，建议先添加角色"}</div>
              </div>

              <Button onClick={handleOutlineGeneration} disabled={isLoading || characters.length === 0} className="w-full">
                {aiOutline.isLoading ? "生成中..." : "生成故事大纲"}
              </Button>
            </div>

            {result && (
              <div className="pt-4 mt-4 border-t border-border/40">
                <Label className="block mb-2">生成的大纲</Label>
                <ScrollArea className="h-[300px] p-3 border rounded-md bg-muted/10">
                  <div className="whitespace-pre-wrap">{result}</div>
                </ScrollArea>
                {onApplyContent && (
                  <Button onClick={applyContent} className="w-full mt-3">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    应用此大纲
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* 章节生成 */}
          <TabsContent value="chapter" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="outline-section">选择大纲章节</Label>
                <Select value={selectedOutlineSection} onValueChange={setSelectedOutlineSection}>
                  <SelectTrigger id="outline-section">
                    <SelectValue placeholder="选择大纲章节" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlineSections.length > 0 ? (
                      outlineSections.map((section, index) => (
                        <SelectItem key={index} value={section.content}>
                          {section.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        未找到大纲章节
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="chapter-title">章节标题</Label>
                <Input id="chapter-title" placeholder="输入章节标题..." value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} />
              </div>

              <Button onClick={handleChapterGeneration} disabled={isLoading || !selectedOutlineSection} className="w-full">
                {aiChapter.isLoading ? "生成中..." : "生成章节内容"}
              </Button>
            </div>

            {result && (
              <div className="pt-4 mt-4 border-t border-border/40">
                <Label className="block mb-2">生成的章节</Label>
                <ScrollArea className="h-[300px] p-3 border rounded-md bg-muted/10">
                  <div className="whitespace-pre-wrap">{result}</div>
                </ScrollArea>
                {onApplyContent && (
                  <Button onClick={applyContent} className="w-full mt-3">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    应用此章节
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* 角色生成 */}
          <TabsContent value="character" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="character-prompt">角色描述提示</Label>
                <Textarea id="character-prompt" placeholder="描述角色的基本特征，如：一个聪明谨慎的女侦探，有着敏锐的洞察力..." value={characterPrompt} onChange={(e) => setCharacterPrompt(e.target.value)} className="h-32" />
              </div>

              <Button onClick={handleCharacterGeneration} disabled={isLoading || !characterPrompt.trim()} className="w-full">
                {aiCharacter.isLoading ? "生成中..." : "生成角色描述"}
              </Button>
            </div>

            {generatedCharacter && (
              <div className="pt-4 mt-4 border-t border-border/40">
                <Card className="bg-muted/10">
                  <CardHeader>
                    <CardTitle>{generatedCharacter.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="whitespace-pre-wrap">{generatedCharacter.description}</div>
                    </ScrollArea>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      保存角色
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
