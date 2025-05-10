"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Lightbulb, Users, ListTree, FileText, Pencil, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// 故事阶段类型
type StoryStage = "planning" | "characters" | "outline" | "writing" | "editing" | "complete";

// 故事数据接口
interface StoryData {
  id: string;
  title: string;
  currentStage: StoryStage;
  characterCount: number;
  outlineCompleted: boolean;
  chapterCount: number;
  wordCount: number;
}

interface CreationFlowProps {
  storyId: string;
  storyData: StoryData;
}

export function CreationFlow({ storyId, storyData }: CreationFlowProps) {
  // 流程步骤定义
  const flowSteps = [
    {
      id: "planning",
      title: "故事规划",
      description: "明确你的故事类型、主题和受众",
      icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
      color: "border-amber-500/50 bg-amber-500/10",
      href: `/story/${storyId}`,
      button: "开始规划",
      aiButton: "AI辅助规划",
      aiHref: `/story/${storyId}/ai-assistant?type=planning`,
    },
    {
      id: "characters",
      title: "角色创作",
      description: "创建详细的角色背景、个性和动机",
      icon: <Users className="w-5 h-5 text-blue-500" />,
      color: "border-blue-500/50 bg-blue-500/10",
      href: `/story/${storyId}/character`,
      button: "管理角色",
      aiButton: "AI生成角色",
      aiHref: `/story/${storyId}/character/extract`,
    },
    {
      id: "outline",
      title: "大纲编写",
      description: "规划故事结构、情节发展和转折点",
      icon: <ListTree className="w-5 h-5 text-green-500" />,
      color: "border-green-500/50 bg-green-500/10",
      href: `/story/${storyId}/outline`,
      button: "编辑大纲",
      aiButton: "AI生成大纲",
      aiHref: `/story/${storyId}/outline/generate-from-characters`,
    },
    {
      id: "writing",
      title: "内容创作",
      description: "根据大纲开展章节写作",
      icon: <FileText className="w-5 h-5 text-violet-500" />,
      color: "border-violet-500/50 bg-violet-500/10",
      href: `/story/${storyId}/chapter`,
      button: "开始写作",
      aiButton: "AI辅助写作",
      aiHref: `/story/${storyId}/chapter/generate-from-outline`,
    },
    {
      id: "editing",
      title: "内容修改",
      description: "润色语言、完善细节、确保情节连贯",
      icon: <Pencil className="w-5 h-5 text-orange-500" />,
      color: "border-orange-500/50 bg-orange-500/10",
      href: `/story/${storyId}/ai-assistant?type=editing`,
      button: "编辑内容",
      aiButton: "AI内容分析",
      aiHref: `/story/${storyId}/analyze-consistency`,
    },
    {
      id: "complete",
      title: "故事完成",
      description: "庆祝你的成就，分享或导出你的作品",
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      color: "border-emerald-500/50 bg-emerald-500/10",
      href: `/story/${storyId}`,
      button: "导出作品",
      aiButton: "AI总结反馈",
      aiHref: `/story/${storyId}/ai-assistant?type=feedback`,
    },
  ];

  // 获取当前阶段索引
  const getCurrentStageIndex = () => {
    const stageIds = flowSteps.map((step) => step.id);
    return stageIds.indexOf(storyData.currentStage);
  };

  const currentStageIndex = getCurrentStageIndex();
  const currentStage = flowSteps[currentStageIndex];
  const nextStage = currentStageIndex < flowSteps.length - 1 ? flowSteps[currentStageIndex + 1] : null;

  // 计算总体进度百分比
  const calculateProgress = () => {
    const totalSteps = flowSteps.length - 1; // 不包括最后的complete状态
    return Math.round((currentStageIndex / totalSteps) * 100);
  };

  // 获取当前阶段的完成情况说明
  const getStageProgress = () => {
    switch (storyData.currentStage) {
      case "planning":
        return "已创建故事基础信息";
      case "characters":
        return `已创建 ${storyData.characterCount} 个角色`;
      case "outline":
        return storyData.outlineCompleted ? "大纲已完成" : "大纲编写中";
      case "writing":
        return `已创建 ${storyData.chapterCount} 个章节 (${storyData.wordCount.toLocaleString()} 字)`;
      case "editing":
        return "内容润色中";
      case "complete":
        return "故事已完成!";
      default:
        return "准备开始创作";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 总体进度 */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center mb-1">
            <CardTitle className="text-xl">创作进度</CardTitle>
            <Badge variant="outline" className={cn("font-normal", currentStage.color)}>
              {currentStage.icon}
              <span className="ml-1">{currentStage.title}</span>
            </Badge>
          </div>
          <CardDescription>
            {getStageProgress()} · 总进度 {calculateProgress()}%
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <Progress value={calculateProgress()} className="h-2" />

          <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-6 gap-2">
            {flowSteps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center text-center">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-2", index <= currentStageIndex ? `${step.color} border-current` : "border-muted-foreground/30 text-muted-foreground/50")}>{step.icon}</div>
                <span className={cn("mt-1 text-xs", index <= currentStageIndex ? "font-medium" : "text-muted-foreground")}>{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 当前阶段 */}
      <Card className={cn("shadow-sm", currentStage.color, "border-current")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStage.icon}
            当前阶段: {currentStage.title}
          </CardTitle>
          <CardDescription>{currentStage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {storyData.currentStage === "planning" && "明确故事的主题、背景和基本设定。考虑故事的受众和目标。"}
            {storyData.currentStage === "characters" && "创建故事中的主要角色和配角。详细描述他们的外貌、性格、背景故事和动机。"}
            {storyData.currentStage === "outline" && "规划故事的整体结构，包括开端、发展、高潮和结局。确定主要情节点和转折。"}
            {storyData.currentStage === "writing" && "根据大纲开始撰写正文。按照章节逐步展开故事情节，塑造人物形象。"}
            {storyData.currentStage === "editing" && "检查内容的连贯性、一致性和完整性。优化语言表达，完善故事细节。"}
            {storyData.currentStage === "complete" && "恭喜！你的故事已经完成。现在可以导出、分享或发布你的作品。"}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href={currentStage.href}>
            <Button>
              {currentStage.button}
              <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
          <Link href={currentStage.aiHref}>
            <Button variant="outline" className="gap-1">
              <Sparkles className="w-4 h-4" />
              {currentStage.aiButton}
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* 下一阶段提示 */}
      {nextStage && (
        <Card className="shadow-sm border-dashed border-muted-foreground/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              {nextStage.icon}
              下一阶段: {nextStage.title}
            </CardTitle>
            <CardDescription>{nextStage.description}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href={nextStage.href} className="w-full">
              <Button variant="outline" className="w-full justify-between">
                <span>提前准备{nextStage.title}阶段</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
