"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, BookOpen, Users, AlertCircle, Loader2, BookText, Heart, Brain, Network, LineChart } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  description?: string | null;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
}

interface AnalysisResult {
  characterId: string;
  name: string;
  analysis: {
    appearances: string[];
    actions: string[];
    emotions: string[];
    relationships: string[];
    development: string[];
    consistency: string[];
    suggestions: string[];
  };
}

interface CharacterAnalysisProps {
  storyId: string;
  characters: Character[];
  chapters: Chapter[];
}

export function CharacterAnalysis({ storyId, characters, chapters }: CharacterAnalysisProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<string>("development");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<string>("select");

  // 选择所有章节
  const selectAllChapters = () => {
    setSelectedChapterIds(chapters.map((chapter) => chapter.id));
  };

  // 清除所有章节选择
  const clearChapterSelection = () => {
    setSelectedChapterIds([]);
  };

  // 处理单个章节选择
  const handleChapterSelect = (chapterId: string, checked: boolean) => {
    if (checked) {
      setSelectedChapterIds([...selectedChapterIds, chapterId]);
    } else {
      setSelectedChapterIds(selectedChapterIds.filter((id) => id !== chapterId));
    }
  };

  // 处理单个角色选择
  const handleCharacterSelect = (characterId: string, checked: boolean) => {
    if (checked) {
      setSelectedCharacterIds([...selectedCharacterIds, characterId]);
    } else {
      setSelectedCharacterIds(selectedCharacterIds.filter((id) => id !== characterId));
    }
  };

  // 执行角色分析
  const performAnalysis = async () => {
    if (selectedCharacterIds.length === 0) {
      toast.error("请至少选择一个角色进行分析");
      return;
    }

    if (selectedChapterIds.length === 0) {
      toast.error("请至少选择一个章节进行分析");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch(`/api/user/story/${storyId}/character/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterIds: selectedCharacterIds,
          chapterIds: selectedChapterIds,
        }),
      });

      if (!response.ok) {
        throw new Error("分析请求失败");
      }

      const data = await response.json();

      if (data.success && data.data.analysis) {
        setResults(data.data.analysis.results);
        setActiveTab("results");
        toast.success("角色分析完成");
      } else {
        throw new Error("无法获取分析结果");
      }
    } catch (error) {
      console.error("角色分析失败:", error);
      toast.error("角色分析失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染分析结果
  const renderResults = () => {
    if (!results || results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <AlertCircle className="w-12 h-12 mb-4 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-medium">无分析结果</h3>
          <p className="text-muted-foreground">请先选择角色和章节，然后点击"开始分析"按钮</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Tabs defaultValue="development" value={analysisType} onValueChange={setAnalysisType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="development" className="flex items-center gap-1.5">
              <LineChart className="w-4 h-4" />
              角色发展
            </TabsTrigger>
            <TabsTrigger value="emotions" className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              情感变化
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-1.5">
              <BookText className="w-4 h-4" />
              行为决策
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-1.5">
              <Network className="w-4 h-4" />
              人物关系
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              改进建议
            </TabsTrigger>
          </TabsList>

          {results.map((result) => (
            <div key={result.characterId} className="mt-6">
              <Card className="mb-6 overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <CardTitle>{result.name}</CardTitle>
                  <CardDescription>角色分析结果</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <TabsContent value="development" className="mt-0">
                    <h3 className="mb-2 text-lg font-medium">角色发展轨迹</h3>
                    <div className="space-y-4">
                      {result.analysis.development.map((item, index) => (
                        <div key={index} className="p-4 border rounded-md bg-muted/20">
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="emotions" className="mt-0">
                    <h3 className="mb-2 text-lg font-medium">情感变化分析</h3>
                    <div className="space-y-4">
                      {result.analysis.emotions.map((item, index) => (
                        <div key={index} className="p-4 border rounded-md bg-muted/20">
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="actions" className="mt-0">
                    <h3 className="mb-2 text-lg font-medium">关键行动和决策</h3>
                    <div className="space-y-4">
                      {result.analysis.actions.map((item, index) => (
                        <div key={index} className="p-4 border rounded-md bg-muted/20">
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="relationships" className="mt-0">
                    <h3 className="mb-2 text-lg font-medium">人物关系网络</h3>
                    <div className="space-y-4">
                      {result.analysis.relationships.map((item, index) => (
                        <div key={index} className="p-4 border rounded-md bg-muted/20">
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="suggestions" className="mt-0">
                    <h3 className="mb-2 text-lg font-medium">角色改进建议</h3>
                    <div className="space-y-4">
                      {result.analysis.suggestions.map((item, index) => (
                        <div key={index} className="p-4 border rounded-md bg-muted/20">
                          <p>{item}</p>
                        </div>
                      ))}
                      <Alert>
                        <AlertCircle className="w-4 h-4" />
                        <AlertTitle>一致性评分</AlertTitle>
                        <AlertDescription className="flex items-center mt-2">
                          <div className="w-full mr-4">
                            <Progress value={calculateConsistencyScore(result.analysis.consistency)} className="h-2" />
                          </div>
                          <span className="font-medium">{calculateConsistencyScore(result.analysis.consistency)}%</span>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          ))}
        </Tabs>
      </div>
    );
  };

  // 计算角色一致性得分
  const calculateConsistencyScore = (consistencyItems: string[]): number => {
    // 简单算法，基于一致性评论的积极程度估算得分
    // 实际应用中可能需要从API获取确切得分

    const positiveTerms = ["一致", "符合", "连贯", "保持", "良好", "成功"];
    const negativeTerms = ["不一致", "偏离", "矛盾", "冲突", "问题", "差异"];

    let score = 75; // 默认基础分

    // 分析每个一致性评论的内容
    for (const item of consistencyItems) {
      for (const term of positiveTerms) {
        if (item.includes(term)) score += 5;
      }
      for (const term of negativeTerms) {
        if (item.includes(term)) score -= 7;
      }
    }

    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          角色分析工具
        </CardTitle>
        <CardDescription>深入分析你的角色发展、关系和一致性</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="select" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              选择角色和章节
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-1.5" disabled={!results}>
              <Sparkles className="w-4 h-4" />
              查看分析结果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-6">
            {/* 角色选择 */}
            <div>
              <Label className="mb-2 text-lg font-medium">选择角色</Label>
              <div className="grid grid-cols-2 gap-4 mt-3 md:grid-cols-3">
                {characters.map((character) => (
                  <div key={character.id} className="flex items-start space-x-2">
                    <Checkbox id={`character-${character.id}`} checked={selectedCharacterIds.includes(character.id)} onCheckedChange={(checked) => handleCharacterSelect(character.id, checked === true)} />
                    <Label htmlFor={`character-${character.id}`} className="font-normal cursor-pointer">
                      {character.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 章节选择 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-lg font-medium">选择章节</Label>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllChapters}>
                    全选
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearChapterSelection}>
                    清除
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-64 mt-3">
                <div className="space-y-2 pr-4">
                  {chapters
                    .sort((a, b) => a.order - b.order)
                    .map((chapter) => (
                      <div key={chapter.id} className="flex items-start space-x-2">
                        <Checkbox id={`chapter-${chapter.id}`} checked={selectedChapterIds.includes(chapter.id)} onCheckedChange={(checked) => handleChapterSelect(chapter.id, checked === true)} />
                        <Label htmlFor={`chapter-${chapter.id}`} className="font-normal cursor-pointer">
                          {chapter.title}
                          <Badge className="ml-2 text-xs" variant="outline">
                            第{chapter.order}章
                          </Badge>
                        </Label>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {renderResults()}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {activeTab === "select" ? (
          <Button onClick={performAnalysis} disabled={isLoading || selectedCharacterIds.length === 0 || selectedChapterIds.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                开始分析
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setActiveTab("select")}>
            <Users className="w-4 h-4 mr-2" />
            重新选择
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
