"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { Textarea } from "./textarea";
import { toast } from "sonner";
import { Lightbulb, Loader2, ArrowUpCircle, Wand2, RefreshCw } from "lucide-react";
import { useAIWritingSuggestion } from "@/lib/hooks/useAI";

type AssistantAction = "improve-description" | "enhance-dialogue" | "expand-scene" | "fix-grammar" | "suggest-continuation";

interface AssistantOption {
  id: AssistantAction;
  label: string;
  prompt: (selectedText: string) => string;
  icon: React.ReactNode;
}

const assistantOptions: AssistantOption[] = [
  {
    id: "improve-description",
    label: "优化描述",
    prompt: (text) => `给我提供一个更加生动、详细且引人入胜的版本，用于替换以下描述：\n\n${text}`,
    icon: <Lightbulb className="w-4 h-4" />,
  },
  {
    id: "enhance-dialogue",
    label: "增强对话",
    prompt: (text) => `优化以下对话，使其更加自然、有个性，并增加角色特点：\n\n${text}`,
    icon: <ArrowUpCircle className="w-4 h-4" />,
  },
  {
    id: "expand-scene",
    label: "扩展场景",
    prompt: (text) => `基于以下场景，扩展更多细节，包括环境、人物感受和氛围：\n\n${text}`,
    icon: <Wand2 className="w-4 h-4" />,
  },
  {
    id: "fix-grammar",
    label: "修正语法",
    prompt: (text) => `修正以下文本中的语法、拼写和标点符号问题：\n\n${text}`,
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    id: "suggest-continuation",
    label: "建议续写",
    prompt: (text) => `基于以下文本，提供一个合理且有趣的情节续写：\n\n${text}`,
    icon: <Wand2 className="w-4 h-4" />,
  },
];

interface AIWritingAssistantProps {
  selectedText: string;
  onApplySuggestion: (suggestion: string) => void;
}

export function AIWritingAssistant({ selectedText, onApplySuggestion }: AIWritingAssistantProps) {
  const [activeAction, setActiveAction] = useState<AssistantAction | null>(null);

  // 使用useAIWritingSuggestion钩子
  const writingSuggestion = useAIWritingSuggestion({
    successMessage: "写作建议已生成",
    errorMessage: "生成建议时发生错误",
  });

  const handleActionSelect = (action: AssistantAction) => {
    if (!selectedText) {
      toast.warning("请先选择一段文本", {
        description: "在编辑器中选择文本后再使用 AI 辅助功能",
      });
      return;
    }

    const option = assistantOptions.find((opt) => opt.id === action);
    if (option) {
      setActiveAction(action);
      writingSuggestion.reset();
      writingSuggestion.execute(option.prompt(selectedText));
    }
  };

  const handleApply = () => {
    if (writingSuggestion.data) {
      onApplySuggestion(writingSuggestion.data);
      setActiveAction(null);
      toast.success("已应用 AI 建议");
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">AI 写作助手</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {assistantOptions.map((option) => (
            <Button key={option.id} variant={activeAction === option.id ? "default" : "outline"} size="sm" onClick={() => handleActionSelect(option.id)} disabled={writingSuggestion.isLoading} className="flex items-center justify-start gap-2">
              {option.icon}
              {option.label}
            </Button>
          ))}
        </div>

        {activeAction && (
          <div className="space-y-2">
            <div className="text-sm font-medium">AI 建议</div>
            <div className="relative">
              <div className="rounded-md border p-3 bg-muted/30 min-h-[120px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {writingSuggestion.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  writingSuggestion.data || "请选择一个动作并选择文本来获取 AI 建议..."
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {activeAction && (
        <CardFooter className="flex justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => setActiveAction(null)}>
            取消
          </Button>
          <Button size="sm" onClick={handleApply} disabled={writingSuggestion.isLoading || !writingSuggestion.data}>
            应用建议
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
