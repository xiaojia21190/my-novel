"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Users, ListTree, FileText, Settings, Clock, ChevronRight, Sparkles, Home, Lightbulb, Book, PenTool, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StoryNavigationProps {
  storyId: string;
  storyTitle?: string;
  currentStage?: "planning" | "characters" | "outline" | "writing" | "editing" | "complete";
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  stage?: "planning" | "characters" | "outline" | "writing" | "editing" | "complete";
  subItems?: { title: string; href: string; badge?: string }[];
}

export function StoryNavigation({ storyId, storyTitle = "我的故事", currentStage = "planning" }: StoryNavigationProps) {
  const pathname = usePathname();

  // 构建导航项，现在包含创作流程
  const navItems: NavItem[] = [
    {
      title: "故事概览",
      href: `/story/${storyId}`,
      icon: <BookOpen className="w-5 h-5" />,
      stage: "planning",
    },
    {
      title: "角色管理",
      href: `/story/${storyId}/character`,
      icon: <Users className="w-5 h-5" />,
      stage: "characters",
      subItems: [
        {
          title: "添加新角色",
          href: `/story/${storyId}/character/new`,
        },
        {
          title: "角色分析",
          href: `/story/${storyId}/character/analyze`,
          badge: "AI",
        },
        {
          title: "从内容提取角色",
          href: `/story/${storyId}/character/extract`,
          badge: "AI",
        },
      ],
    },
    {
      title: "故事大纲",
      href: `/story/${storyId}/outline`,
      icon: <ListTree className="w-5 h-5" />,
      stage: "outline",
      subItems: [
        {
          title: "编辑大纲",
          href: `/story/${storyId}/outline`,
        },
        {
          title: "从角色生成大纲",
          href: `/story/${storyId}/outline/generate-from-characters`,
          badge: "AI",
        },
      ],
    },
    {
      title: "章节管理",
      href: `/story/${storyId}/chapter`,
      icon: <FileText className="w-5 h-5" />,
      stage: "writing",
      subItems: [
        {
          title: "所有章节",
          href: `/story/${storyId}/chapter`,
        },
        {
          title: "从大纲生成章节",
          href: `/story/${storyId}/chapter/generate-from-outline`,
          badge: "AI",
        },
      ],
    },
    {
      title: "AI助手",
      href: `/story/${storyId}/ai-assistant`,
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      title: "故事设置",
      href: `/story/${storyId}/settings`,
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  // 创作阶段与图标的映射
  const stageIcons = {
    planning: <Lightbulb className="w-4 h-4 text-amber-500" />,
    characters: <Users className="w-4 h-4 text-blue-500" />,
    outline: <ListTree className="w-4 h-4 text-green-500" />,
    writing: <PenTool className="w-4 h-4 text-violet-500" />,
    editing: <FileText className="w-4 h-4 text-orange-500" />,
    complete: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  };

  // 确定当前的创作阶段
  const getCurrentStageIndex = () => {
    const stages = ["planning", "characters", "outline", "writing", "editing", "complete"];
    return stages.indexOf(currentStage);
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="flex flex-col h-full min-h-screen border-r bg-muted/10 border-border/30">
      {/* 标题区域 */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-muted/20 border-border/30">
        <Link href="/" className="flex items-center mb-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Home className="w-3.5 h-3.5" />
          返回首页
        </Link>
        <Link href={`/story/${storyId}`} className="block">
          <h2 className="text-lg font-semibold truncate" title={storyTitle}>
            {storyTitle}
          </h2>
        </Link>
      </div>

      {/* 创作阶段进度指示器 */}
      <div className="p-4 mb-2 border-b border-border/30">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">创作进度</h3>
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 h-1 -z-10 bg-muted/50">
            <div className="h-full bg-primary/70" style={{ width: `${Math.max(5, (currentStageIndex / 5) * 100)}%` }}></div>
          </div>

          <TooltipProvider>
            {["planning", "characters", "outline", "writing", "editing", "complete"].map((stage, index) => (
              <Tooltip key={stage}>
                <TooltipTrigger asChild>
                  <div className={cn("flex items-center justify-center w-6 h-6 rounded-full bg-background border-2", index <= currentStageIndex ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground/50")}>{stageIcons[stage as keyof typeof stageIcons]}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="capitalize">{stage === "planning" ? "规划" : stage === "characters" ? "角色" : stage === "outline" ? "大纲" : stage === "writing" ? "写作" : stage === "editing" ? "编辑" : "完成"}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* 导航区域 */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {navItems.map((item) => (
            <div key={item.href} className="px-2 py-1">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                  item.stage && item.stage === currentStage && "border-l-2 border-primary pl-[10px]"
                )}
              >
                {item.icon}
                <span className="flex-1">{item.title}</span>
                {item.stage === currentStage && (
                  <Badge variant="outline" className="ml-auto text-xs border-primary text-primary">
                    当前阶段
                  </Badge>
                )}
              </Link>

              {/* 子菜单项 */}
              {item.subItems && item.subItems.length > 0 && (
                <div className="ml-9 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link key={subItem.href} href={subItem.href} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors", pathname === subItem.href ? "bg-primary/5 text-primary" : "hover:bg-muted/30 text-muted-foreground hover:text-foreground")}>
                      <ChevronRight className="w-3 h-3" />
                      <span className="flex-1">{subItem.title}</span>
                      {subItem.badge && (
                        <Badge variant="outline" className={cn("ml-auto text-[10px] h-4 px-1", subItem.badge === "AI" && "border-secondary/60 text-secondary")}>
                          {subItem.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 底部区域 */}
      <div className="p-4 border-t border-border/30">
        <Link href="/" className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-muted/50">
          返回所有故事
        </Link>
      </div>
    </div>
  );
}
