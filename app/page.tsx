"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/lib/theme-context";
import { generatePrompts, continueStory, StoredStory, saveStory as saveStoryToStorage, isUserLoggedIn, getAllStories, deleteStory } from "@/lib/api-service";
import { Moon, Sun, HomeIcon, Book, History, Sparkles, BookOpen, LogIn, Plus, Trash2, Pencil, Clock, Users, ListTree, FileText, ArrowRight, MoreHorizontal, Check, Calendar, LucideIcon } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// 故事阶段状态类型
type StoryStage = "planning" | "characters" | "outline" | "writing" | "editing" | "complete";

// 扩展StoredStory类型以包含元数据
interface EnhancedStory extends StoredStory {
  stage?: StoryStage;
  characterCount?: number;
  chapterCount?: number;
  wordCount?: number;
  lastEdited?: string;
}

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [stories, setStories] = useState<EnhancedStory[]>([]);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const { isLoaded, isSignedIn, user } = useUser();

  // 获取所有故事
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoading(true);
      try {
        const allStories = await getAllStories();

        // 增强故事数据，添加阶段和统计信息
        const enhancedStories = allStories.map((story) => enhanceStoryWithMetadata(story));

        setStories(enhancedStories);
      } catch (error) {
        console.error("获取故事失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, []);

  // 增强故事数据，添加元数据（模拟数据，实际应用中应从API获取）
  const enhanceStoryWithMetadata = (story: StoredStory): EnhancedStory => {
    // 这里简单判断创建时间距今长短来确定阶段
    // 实际应用中应该从数据库获取真实的阶段信息
    const createdDate = new Date(story.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // 模拟故事阶段 - 实际中需从后端获取
    let stage: StoryStage;
    if (daysSinceCreation < 1) stage = "planning";
    else if (daysSinceCreation < 3) stage = "characters";
    else if (daysSinceCreation < 5) stage = "outline";
    else if (daysSinceCreation < 10) stage = "writing";
    else if (daysSinceCreation < 15) stage = "editing";
    else stage = "complete";

    // 模拟角色数量和章节数量 - 实际中应从后端获取
    const characterCount = Math.floor(Math.random() * 10) + 1;
    const chapterCount = Math.floor(Math.random() * 5);

    // 统计字数
    const wordCount = story.content.join(" ").length;

    return {
      ...story,
      stage,
      characterCount,
      chapterCount,
      wordCount,
      lastEdited: story.updatedAt,
    };
  };

  // 创建新故事
  const handleCreateStory = async () => {
    if (!newStoryTitle.trim()) return;

    setIsCreating(true);
    try {
      // 创建一个带初始内容的新故事
      const initialContent = `${newStoryTitle} - 开始创作你的故事吧！`;
      const newStory = await saveStoryToStorage(newStoryTitle, initialContent);

      // 向列表添加新故事并增强元数据
      const enhancedStory = enhanceStoryWithMetadata(newStory);
      setStories([enhancedStory, ...stories]);

      // 重置并关闭对话框
      setNewStoryTitle("");
      setShowCreateDialog(false);
    } catch (error) {
      console.error("创建故事失败:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // 删除故事
  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteStory(storyId);
      setStories(stories.filter((story) => story.id !== storyId));
      setStoryToDelete(null);
    } catch (error) {
      console.error("删除故事失败:", error);
    }
  };

  // 过滤故事列表
  const filteredStories = activeTab === "all" ? stories : stories.filter((story) => story.stage === activeTab);

  // 格式化最后编辑时间
  const formatLastEdited = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "刚刚";
    if (diffInHours < 24) return `${diffInHours}小时前`;

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 获取阶段颜色
  const getStageColor = (stage: StoryStage) => {
    switch (stage) {
      case "planning":
        return "text-amber-500 border-amber-500/50 bg-amber-500/10";
      case "characters":
        return "text-blue-500 border-blue-500/50 bg-blue-500/10";
      case "outline":
        return "text-green-500 border-green-500/50 bg-green-500/10";
      case "writing":
        return "text-violet-500 border-violet-500/50 bg-violet-500/10";
      case "editing":
        return "text-orange-500 border-orange-500/50 bg-orange-500/10";
      case "complete":
        return "text-emerald-500 border-emerald-500/50 bg-emerald-500/10";
      default:
        return "text-muted-foreground border-muted-foreground/50 bg-muted-foreground/10";
    }
  };

  // 获取阶段名称
  const getStageName = (stage: StoryStage) => {
    switch (stage) {
      case "planning":
        return "规划中";
      case "characters":
        return "角色设计";
      case "outline":
        return "大纲编写";
      case "writing":
        return "内容创作";
      case "editing":
        return "内容编辑";
      case "complete":
        return "已完成";
      default:
        return "未知阶段";
    }
  };

  // 获取阶段图标
  const getStageIcon = (stage: StoryStage): LucideIcon => {
    switch (stage) {
      case "planning":
        return Pencil;
      case "characters":
        return Users;
      case "outline":
        return ListTree;
      case "writing":
        return FileText;
      case "editing":
        return Pencil;
      case "complete":
        return Check;
      default:
        return BookOpen;
    }
  };

  // 切换主题
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 py-3 border-b bg-background/90 backdrop-blur-sm border-border/40">
        <div className="container flex items-center justify-between mx-auto">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">AI互动小说</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={toggleTheme} className="transition-all shadow-sm cursor-pointer hover:shadow-md">
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" className="transition-all shadow-sm cursor-pointer hover:shadow-md">
                  <LogIn className="w-5 h-5 mr-2" />
                  登录/注册
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                userProfileUrl="/profile"
                userProfileMode="navigation"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9",
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="container flex-1 py-8 mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">我的故事</h1>
            <p className="mt-1 text-muted-foreground">{isSignedIn ? `欢迎回来，${user?.firstName || "作家"}！继续你的创作之旅。` : "创建和管理你的小说作品。"}</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                创建新故事
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新故事</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <label className="block mb-2 text-sm font-medium">故事标题</label>
                <Input value={newStoryTitle} onChange={(e) => setNewStoryTitle(e.target.value)} placeholder="输入故事标题" className="w-full" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateStory} disabled={!newStoryTitle.trim() || isCreating}>
                  {isCreating ? "创建中..." : "创建故事"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 未登录提示 */}
        {!isLoaded || !isSignedIn ? (
          <Alert className="mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            <AlertDescription>
              登录后可以跨设备同步故事，并获取更多高级功能。
              <SignInButton mode="modal">
                <Button variant="link" className="h-auto p-0 ml-2">
                  立即登录
                </Button>
              </SignInButton>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* 故事筛选标签 */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">全部故事</TabsTrigger>
            <TabsTrigger value="planning">规划中</TabsTrigger>
            <TabsTrigger value="characters">角色设计</TabsTrigger>
            <TabsTrigger value="outline">大纲编写</TabsTrigger>
            <TabsTrigger value="writing">内容创作</TabsTrigger>
            <TabsTrigger value="editing">内容编辑</TabsTrigger>
            <TabsTrigger value="complete">已完成</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 故事列表/网格 */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <CardHeader className="pb-2">
                  <div className="w-3/4 h-6 mb-1 rounded-md bg-muted/60"></div>
                  <div className="w-1/2 h-4 rounded-md bg-muted/40"></div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-16 rounded-md bg-muted/30"></div>
                </CardContent>
                <CardFooter>
                  <div className="w-full h-8 rounded-md bg-muted/20"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStories.map((story) => {
              const StageIcon = getStageIcon(story.stage || "planning");
              return (
                <Card key={story.id} className="flex flex-col overflow-hidden transition-all border-border/60 hover:shadow-md hover:border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">{story.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatLastEdited(story.lastEdited || story.updatedAt)}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setStoryToDelete(story.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除故事
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Badge variant="outline" className={cn("mt-2 w-fit", getStageColor(story.stage || "planning"))}>
                      <StageIcon className="w-3.5 h-3.5 mr-1" />
                      {getStageName(story.stage || "planning")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-3 gap-2 py-2 mt-2 text-sm border-t border-border/30">
                      <div className="text-center">
                        <div className="font-medium">{story.characterCount || 0}</div>
                        <div className="text-xs text-muted-foreground">角色</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{story.chapterCount || 0}</div>
                        <div className="text-xs text-muted-foreground">章节</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{story.wordCount ? Math.floor(story.wordCount / 1000) + "k" : 0}</div>
                        <div className="text-xs text-muted-foreground">字数</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border/30">
                    <div className="w-full">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/story/${story.id}`} passHref>
                              <Button variant="default" className="w-full gap-1">
                                继续创作
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>继续《{story.title}》的创作过程</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-border/50">
            <BookOpen className="w-12 h-12 mb-4 text-muted-foreground/60" />
            <h3 className="text-lg font-medium">还没有故事</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">{activeTab === "all" ? "开始创作你的第一个故事吧！" : `没有处于${getStageName(activeTab as StoryStage)}阶段的故事。`}</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建新故事
            </Button>
          </div>
        )}

        {/* 删除确认对话框 */}
        <Dialog open={!!storyToDelete} onOpenChange={(open) => !open && setStoryToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
            </DialogHeader>
            <p className="py-4">确定要删除这个故事吗？此操作无法撤销。</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStoryToDelete(null)}>
                取消
              </Button>
              <Button variant="destructive" onClick={() => storyToDelete && handleDeleteStory(storyToDelete)}>
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 页脚 */}
      <footer className="py-6 border-t border-border/40 bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 AI互动小说 版权所有</p>
        </div>
      </footer>
    </main>
  );
}
