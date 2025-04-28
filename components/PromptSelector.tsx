"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, LightbulbIcon, Sparkles, ChevronRight } from "lucide-react";

interface PromptSelectorProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  isGenerating: boolean;
}

export function PromptSelector({ prompts, onSelectPrompt, isGenerating }: PromptSelectorProps) {
  if (prompts.length === 0) return null;

  const promptIcons = [<Sparkles key={0} className="w-5 h-5" />, <LightbulbIcon key={1} className="w-5 h-5" />, <ArrowRight key={2} className="w-5 h-5" />];

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => (
        <Card key={index} className={`overflow-hidden transition-all duration-300 border-2 hover:shadow-md hover:translate-y-[-1px] ${isGenerating ? "opacity-60 pointer-events-none" : "hover:border-secondary/50 cursor-pointer"}`}>
          <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-secondary/10 to-primary/5">
            <div className="flex items-center justify-center w-8 h-8 mr-3 transition-colors rounded-full shadow-md bg-gradient-to-br from-secondary/20 to-primary/10 text-secondary">{promptIcons[index % promptIcons.length]}</div>
            <h3 className="text-lg font-semibold text-secondary">故事方向 {index + 1}</h3>
          </div>
          <CardContent className="p-4">
            <div className="relative pl-3 mb-3 border-l-4 border-secondary/30">
              <p className="text-base break-words whitespace-pre-wrap">{prompt}</p>
            </div>
            <Button onClick={() => onSelectPrompt(prompt)} disabled={isGenerating} className="w-full py-2 mt-2 text-base transition-all shadow-md hover:shadow-lg">
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse bg-background"></span>
                  <span>生成中...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  选择此方向
                  <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}

      {isGenerating && (
        <div className="flex justify-center mt-4">
          <div className="px-6 py-2 text-sm font-medium text-center rounded-full bg-muted/50">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse bg-secondary"></span>
              <span>正在生成新的故事内容...</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
