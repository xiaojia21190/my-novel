"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, LightbulbIcon, Sparkles, Wand2 } from "lucide-react";

interface PromptSelectorProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  isGenerating: boolean;
}

export function PromptSelector({ prompts, onSelectPrompt, isGenerating }: PromptSelectorProps) {
  if (prompts.length === 0) return null;

  const promptIcons = [<Sparkles key={0} className="w-6 h-6" />, <LightbulbIcon key={1} className="w-6 h-6" />, <ArrowRight key={2} className="w-6 h-6" />];

  return (
    <div className="w-full mt-16 animate-fadeIn">
      <Card className="overflow-hidden border-2 shadow-xl border-secondary/30">
        <CardHeader className="py-6 border-b bg-gradient-to-r from-secondary/20 to-primary/10 border-border/30">
          <CardTitle className="flex items-center justify-center gap-3 text-3xl text-center">
            <Wand2 className="w-8 h-8 text-secondary" />
            选择一个故事发展方向
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 bg-gradient-to-b from-background to-muted/20">
          <div className="grid gap-6">
            {prompts.map((prompt, index) => (
              <Card key={index} className={`cursor-pointer overflow-hidden transition-all duration-300 border-2 hover:shadow-xl ${isGenerating ? "opacity-60" : "hover:border-secondary/60"}`}>
                <Button variant="ghost" className="flex items-center w-full h-auto gap-6 p-8 text-left rounded-none cursor-pointer group hover:bg-secondary/5" onClick={() => onSelectPrompt(prompt)} disabled={isGenerating}>
                  <div className="flex items-center justify-center w-16 h-16 transition-colors rounded-full shadow-md bg-gradient-to-br from-secondary/20 to-primary/10 text-secondary group-hover:from-secondary/30 group-hover:to-primary/20">{promptIcons[index % promptIcons.length]}</div>
                  <div className="flex-1 ">
                    <div className="relative pl-3 border-l-4 border-secondary/30">
                      <p className="text-xl font-medium break-words whitespace-pre-wrap">{prompt}</p>
                    </div>
                  </div>
                  <div className="transition-transform group-hover:translate-x-2">
                    <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-secondary" />
                  </div>
                </Button>
              </Card>
            ))}
          </div>

          {isGenerating && (
            <div className="flex justify-center mt-8">
              <div className="px-8 py-4 text-base font-medium text-center rounded-full bg-muted/50">
                <span className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full animate-pulse bg-secondary"></span>
                  <span>正在生成新的故事内容...</span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
