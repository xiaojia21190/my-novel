"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Save, BookText, Users, Wand, MessageSquare, AlertCircle, RefreshCw, Check, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getAiAssistance, analyzeConsistency } from "@/lib/api-service";
import { useAutoSave } from "@/lib/auto-save";

// 定义类型
interface Character {
  id: string;
  name: string;
  description?: string;
  attributes?: any;
}

interface OutlineSection {
  title: string;
  content: string;
}

interface ConsistencyCheckResult {
  score: number;
  issues: any[];
  suggestions: string[];
  summary: string;
}

interface EditorProps {
  initialContent?: string;
  onSave?: (content: string) => Promise<void>;
  storyId: string;
  characters?: Character[];
  outlineSections?: OutlineSection[];
  chapterId?: string;
  storyTitle?: string;
}

export function InteractiveEditor({ initialContent = "", onSave, storyId, characters = [], outlineSections = [], chapterId, storyTitle = "" }: EditorProps) {
  // 状态管理
  const [content, setContent] = useState(initialContent);
  const [selectedText, setSelectedText] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState("characters");
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [consistencyCheck, setConsistencyCheck] = useState<ConsistencyCheckResult | null>(null);
  const [consistencyType, setConsistencyType] = useState("character");
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [assistanceType, setAssistanceType] = useState("creative_suggestion");
  const [specificRequest, setSpecificRequest] = useState("");
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();

  const { isSaving, lastSaved, forceSave } = useAutoSave(
    content,
    async (currentContent) => {
      if (onSave) {
        await onSave(currentContent);
      }
    },
    {
      interval: 60000,
      saveDelay: 3000,
      minChanges: 5,
      onSaveStart: () => {
        setSaveStatus("saving");
      },
      onSaveSuccess: () => {
        setSaveStatus("saved");
        toast.success("内容已自动保存", { duration: 2000, id: "auto-save-success" });
      },
      onSaveError: (error) => {
        setSaveStatus("error");
        toast.error("自动保存失败", { duration: 3000, id: "auto-save-error" });
      },
    }
  );

  // 初始化编辑器
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // 处理文本选择
  const handleTextSelect = () => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(content.substring(start, end));
      } else {
        setSelectedText("");
      }
    }
  };

  // 保存内容
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await forceSave();
      toast.success("内容已保存");
    } catch (error) {
      toast.error("保存失败");
      console.error("保存错误:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取AI辅助
  const handleGetAiAssistance = async () => {
    setIsLoading(true);
    try {
      const result = await getAiAssistance(storyId, {
        content,
        assistanceType,
        specificRequest,
        selectedText,
        characterIds: selectedCharacters,
      });

      setAiSuggestion(result);
      setShowAiDialog(true);
    } catch (error) {
      toast.error("获取AI辅助失败");
      console.error("AI辅助错误:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 应用AI建议
  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;

    if (selectedText && editorRef.current) {
      // 替换选中的文本
      const start = content.indexOf(selectedText);
      if (start !== -1) {
        const newContent = content.substring(0, start) + aiSuggestion + content.substring(start + selectedText.length);
        setContent(newContent);
      }
    } else {
      // 追加到内容末尾
      setContent((prev) => prev + "\n\n" + aiSuggestion);
    }

    setShowAiDialog(false);
    setAiSuggestion("");
    toast.success("已应用AI建议");
  };

  // 检查内容一致性
  const checkConsistency = async () => {
    setIsLoading(true);
    try {
      const result = await analyzeConsistency(storyId, content, consistencyType as any, chapterId);

      let processedResult;
      if (consistencyType === "all") {
        // 全面检查返回多个维度
        const { overallScore, character, plot, setting, summary } = result;
        processedResult = {
          score: overallScore,
          issues: [...character.issues.map((i: any) => ({ ...i, type: "角色" })), ...plot.issues.map((i: any) => ({ ...i, type: "情节" })), ...setting.issues.map((i: any) => ({ ...i, type: "设定" }))],
          suggestions: [...character.strengths, ...plot.strengths, ...setting.strengths],
          summary,
        };
      } else {
        // 单一维度检查
        const { score, issues, strengths, summary } = result;
        processedResult = {
          score,
          issues,
          suggestions: strengths,
          summary,
        };
      }

      setConsistencyCheck(processedResult);
      setActiveTab("consistency");
    } catch (error) {
      toast.error("检查一致性失败");
      console.error("一致性检查错误:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full">
      {/* 主编辑区 */}
      <div className={`flex-1 flex flex-col ${showSidebar ? "mr-4" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{storyTitle}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
              {showSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              {showSidebar ? "隐藏辅助面板" : "显示辅助面板"}
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={checkConsistency} disabled={isLoading}>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    一致性检查
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>检查内容与角色、情节、设定的一致性</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" size="sm" onClick={() => setShowAiDialog(true)} disabled={isLoading}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI辅助
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleSave} disabled={isLoading || isSaving}>
                    {isLoading || isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : saveStatus === "error" ? <AlertCircle className="w-4 h-4 mr-2 text-red-500" /> : <Save className="w-4 h-4 mr-2" />}
                    {isLoading || isSaving ? "保存中..." : saveStatus === "error" ? "保存失败" : "保存"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{lastSaved ? <p>上次保存: {lastSaved.toLocaleTimeString()}</p> : <p>尚未保存</p>}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-2 flex items-center">
          {isSaving ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              <span>正在自动保存...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="w-3 h-3 mr-1 text-green-500" />
              <span>已自动保存于 {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : (
            <span>编辑后将自动保存</span>
          )}
        </div>

        <Textarea ref={editorRef} value={content} onChange={(e) => setContent(e.target.value)} onSelect={handleTextSelect} className="flex-1 min-h-[70vh] text-base leading-relaxed p-4" placeholder="开始创作您的内容..." />

        {/* AI辅助对话框 */}
        <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>AI创作辅助</DialogTitle>
              <DialogDescription>选择辅助类型并提供具体需求</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="assistance-type" className="text-right">
                  辅助类型
                </Label>
                <Select value={assistanceType} onValueChange={(value: string) => setAssistanceType(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择辅助类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="character_dialogue">角色对话</SelectItem>
                    <SelectItem value="plot_development">情节发展</SelectItem>
                    <SelectItem value="setting_description">场景描述</SelectItem>
                    <SelectItem value="creative_suggestion">创意建议</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assistanceType === "character_dialogue" && (
                <div className="grid items-center grid-cols-4 gap-4">
                  <Label htmlFor="characters" className="text-right">
                    选择角色
                  </Label>
                  <div className="col-span-3">
                    <Select value={selectedCharacters[0] || ""} onValueChange={(value: string) => setSelectedCharacters([value])}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择角色" />
                      </SelectTrigger>
                      <SelectContent>
                        {characters.map((character) => (
                          <SelectItem key={character.id} value={character.id}>
                            {character.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="specific-request" className="text-right">
                  具体需求
                </Label>
                <Textarea id="specific-request" placeholder="请描述您的具体需求..." className="col-span-3" value={specificRequest} onChange={(e) => setSpecificRequest(e.target.value)} />
              </div>

              {selectedText && (
                <div className="grid grid-cols-4 gap-4">
                  <Label className="text-right">已选择文本</Label>
                  <div className="col-span-3 p-2 border rounded bg-muted/50">
                    <p className="text-sm line-clamp-3">{selectedText}</p>
                  </div>
                </div>
              )}

              {!aiSuggestion ? (
                <Button onClick={handleGetAiAssistance} disabled={isLoading} className="justify-self-end">
                  {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand className="w-4 h-4 mr-2" />}
                  获取AI建议
                </Button>
              ) : (
                <>
                  <div className="p-3 my-2 border rounded bg-muted/30">
                    <Label>AI建议</Label>
                    <ScrollArea className="h-[200px] mt-2">
                      <div className="p-2 whitespace-pre-wrap">{aiSuggestion}</div>
                    </ScrollArea>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAiDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={applyAiSuggestion}>
                      <Check className="w-4 h-4 mr-2" />
                      应用建议
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 辅助面板 */}
      {showSidebar && (
        <div className="w-1/4 min-w-[300px]">
          <Card className="h-full">
            <CardHeader className="p-4">
              <CardTitle className="text-lg">创作辅助</CardTitle>
              <CardDescription>角色和大纲参考</CardDescription>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="characters">
                    <Users className="w-4 h-4 mr-2" />
                    角色
                  </TabsTrigger>
                  <TabsTrigger value="outline">
                    <BookText className="w-4 h-4 mr-2" />
                    大纲
                  </TabsTrigger>
                  <TabsTrigger value="consistency">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    一致性
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-250px)]">
                <TabsContent value="characters" className="space-y-4">
                  {characters.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无角色信息</p>
                    </div>
                  ) : (
                    characters.map((character) => (
                      <Card key={character.id} className="p-4">
                        <h3 className="font-bold text-md">{character.name}</h3>
                        {character.description && <p className="mt-1 text-sm text-muted-foreground">{character.description}</p>}
                        {character.attributes && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(character.attributes).map(([key, value]) => (
                              <div key={key} className="flex items-start">
                                <span className="mr-2 text-xs font-medium">{key}:</span>
                                <span className="text-xs">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="outline" className="space-y-4">
                  {outlineSections.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <BookText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无大纲信息</p>
                    </div>
                  ) : (
                    outlineSections.map((section, index) => (
                      <Card key={index} className="p-4">
                        <h3 className="font-bold text-md">{section.title}</h3>
                        <p className="mt-1 text-sm">{section.content}</p>
                      </Card>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="consistency">
                  <div className="mb-4">
                    <Select value={consistencyType} onValueChange={(value: string) => setConsistencyType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择检查类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="character">角色一致性</SelectItem>
                        <SelectItem value="plot">情节一致性</SelectItem>
                        <SelectItem value="setting">设定一致性</SelectItem>
                        <SelectItem value="all">全面分析</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={checkConsistency} disabled={isLoading}>
                      {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                      开始检查
                    </Button>
                  </div>

                  {consistencyCheck ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold">一致性评分</h3>
                        <Badge variant={consistencyCheck.score >= 7 ? "default" : consistencyCheck.score >= 5 ? "outline" : "destructive"}>{consistencyCheck.score}/10</Badge>
                      </div>

                      <div>
                        <h4 className="mb-2 text-sm font-semibold">总体评价</h4>
                        <p className="text-sm">{consistencyCheck.summary}</p>
                      </div>

                      {consistencyCheck.issues.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">存在的问题</h4>
                          <ul className="space-y-2">
                            {consistencyCheck.issues.map((issue, idx) => (
                              <li key={idx} className="py-1 pl-2 text-sm border-l-2 border-destructive">
                                {issue.type && (
                                  <Badge variant="outline" className="mb-1">
                                    {issue.type}
                                  </Badge>
                                )}
                                {issue.character && <span className="block font-medium">{issue.character}</span>}
                                <span>{issue.issue || issue.details}</span>
                                {issue.suggestion && (
                                  <div className="mt-1 text-xs">
                                    <span className="font-medium">建议: </span>
                                    {issue.suggestion}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {consistencyCheck.suggestions.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">优点</h4>
                          <ul className="space-y-1">
                            {consistencyCheck.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="py-1 pl-2 text-sm border-l-2 border-green-500">
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>点击"开始检查"分析内容一致性</p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
