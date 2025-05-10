"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { analyzeCoherence, CoherenceAnalysis } from "@/lib/api-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CoherenceCheckerProps {
  previousChapterContent: string;
  currentChapterContent: string;
  onFixSuggestion?: (issue: string) => void;
}

export function CoherenceChecker({ previousChapterContent, currentChapterContent, onFixSuggestion }: CoherenceCheckerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CoherenceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkCoherence = async () => {
    if (!previousChapterContent || !currentChapterContent) {
      setError("上一章节和当前章节的内容不能为空");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeCoherence(previousChapterContent, currentChapterContent);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "连贯性分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFixSuggestion = (issue: string) => {
    if (onFixSuggestion) {
      onFixSuggestion(issue);
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          章节连贯性检查
        </CardTitle>
        <CardDescription>分析当前章节与上一章节的连贯性，检测人物、情节、设定等方面的不一致</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              <Badge variant={analysis.coherent ? "outline" : "destructive"} className={`px-3 py-1 ${analysis.coherent ? "bg-green-50" : "bg-red-50"}`}>
                {analysis.coherent ? <CheckCircle className="mr-1 h-4 w-4 text-green-500" /> : <AlertTriangle className="mr-1 h-4 w-4 text-red-500" />}
                {analysis.coherent ? "连贯性良好" : "存在连贯性问题"}
              </Badge>
            </div>

            {!analysis.coherent && analysis.issues.length > 0 && (
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <h4 className="font-medium mb-2">检测到以下连贯性问题：</h4>
                <ul className="space-y-2">
                  {analysis.issues.map((issue, index) => (
                    <li key={index} className="text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between">
                          <span className="text-red-600 flex-grow">• {issue}</span>
                          {onFixSuggestion && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleFixSuggestion(issue)}>
                                    应用建议
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>将此建议应用到编辑器中</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}

            {analysis.coherent && <div className="text-green-600 p-4 bg-green-50 rounded-md">两个章节之间的连贯性良好，没有检测到明显的不一致或矛盾问题。</div>}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <Button onClick={checkCoherence} disabled={isAnalyzing || !previousChapterContent || !currentChapterContent} className="w-full">
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在分析...
            </>
          ) : (
            "检查连贯性"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
