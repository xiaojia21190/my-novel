"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseOutlineToSections } from "@/lib/api-service";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import toast from "@/lib/toast";
import { checkStoryOwnership } from "@/lib/permissions";

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const storyId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [outline, setOutline] = useState<any>(null);
  const [outlineSections, setOutlineSections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // 加载故事数据
  useEffect(() => {
    // 检查权限
    const checkPermission = async () => {
      try {
        if (!userId) {
          // 未登录，转到登录页
          router.push(`/signin?redirect_url=/story/${storyId}`);
          return;
        }

        // 检查用户是否有权限访问此故事
        const hasAccess = await checkStoryOwnership(storyId, userId);
        setHasPermission(hasAccess);
        setPermissionChecked(true);

        if (!hasAccess) {
          toast({
            title: "权限错误",
            description: "您没有权限访问此故事",
            variant: "destructive",
          });

          // 无权限，返回主页
          setTimeout(() => {
            router.push("/");
          }, 2000);
        } else {
          // 有权限，加载故事数据
          fetchStoryData();
        }
      } catch (error) {
        console.error("权限检查错误", error);
        toast({
          title: "检查权限时出错",
          description: "无法验证您的访问权限",
          variant: "destructive",
        });
        setPermissionChecked(true);
        setHasPermission(false);
      }
    };

    if (storyId && userId !== undefined) {
      checkPermission();
    }
  }, [userId, storyId, router]);

  const fetchStoryData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/story/${storyId}`);

      if (!response.ok) {
        if (response.status === 403) {
          // 权限错误
          setHasPermission(false);
          toast({
            title: "权限错误",
            description: "您没有权限访问此故事",
            variant: "destructive",
          });
          router.push("/");
          return;
        }

        throw new Error(`获取故事失败: ${response.status}`);
      }

      const data = await response.json();
      setStory(data);
      setCharacters(data.characters || []);
      setChapters(data.chapters || []);
      setOutline(data.outline);

      // 如果有大纲数据，解析为章节
      if (data.outline) {
        try {
          // 尝试解析为结构化数据
          const parsedOutline = JSON.parse(data.outline);

          if (Array.isArray(parsedOutline)) {
            setOutlineSections(parsedOutline);
          } else {
            // 可能是自由格式文本
            setOutlineSections(parseOutlineToSections(data.outline));
          }
        } catch (error) {
          // 解析失败，可能是自由格式文本
          setOutlineSections(parseOutlineToSections(data.outline));
        }
      }
    } catch (error) {
      console.error("获取故事数据时出错", error);
      toast({
        title: "加载故事失败",
        description: "无法获取故事数据，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 确定故事的当前阶段
  const getStoryPhase = () => {
    if (!story) return "planning";

    // 基于数据存在与否判断阶段
    if (characters.length === 0) return "planning";
    if (!outline) return "characters";
    if (chapters.length === 0) return "outline";
    if (chapters.some((c) => !c.content)) return "writing";
    return "editing";
  };

  // 准备创作统计数据
  const stats = {
    characters: characters.length,
    chapters: chapters.length,
    writtenChapters: chapters.filter((chapter) => chapter.content && chapter.content.length > 0).length,
    wordCount: chapters.reduce((sum, chapter) => sum + (chapter.content?.length || 0), 0),
  };

  // 权限检查中
  if (!permissionChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="mb-4 text-2xl font-semibold">正在验证权限...</div>
        <div className="w-12 h-12 border-b-2 border-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 无权限访问
  if (permissionChecked && !hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="mb-2 text-2xl font-semibold text-red-600">访问被拒绝</div>
        <p className="mb-4">您没有权限访问此故事或故事不存在</p>
        <button onClick={() => router.push("/")} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
          返回主页
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container p-4 mx-auto">
        <div className="w-full flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <div className="mb-4 text-2xl">加载故事中...</div>
            <div className="w-10 h-10 mx-auto border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // 默认内容
  return (
    <div className="container p-4 mx-auto">
      <div className="flex flex-col gap-6">
        {/* 标题区域 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{story?.title || "未命名故事"}</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/story/${storyId}/edit`}>编辑故事</Link>
            </Button>
          </div>
        </div>

        {/* 内容部分 */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="characters">角色 ({characters.length})</TabsTrigger>
            <TabsTrigger value="outline">大纲</TabsTrigger>
            <TabsTrigger value="chapters">章节 ({chapters.length})</TabsTrigger>
          </TabsList>

          {/* 各标签页内容 */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>故事概览</CardTitle>
                <CardDescription>当前阶段: {getStoryPhase() === "planning" ? "规划" : getStoryPhase() === "characters" ? "角色创建" : getStoryPhase() === "outline" ? "大纲编写" : getStoryPhase() === "writing" ? "章节创作" : "编辑完善"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">角色</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{stats.characters}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">章节</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{stats.chapters}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">已写章节</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{stats.writtenChapters}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">字数</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{stats.wordCount}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="mb-2 text-xl font-semibold">简介</h3>
                  <p className="whitespace-pre-wrap">{story?.summary || "暂无简介"}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">分析故事</Button>
                <Button>导出故事</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* 其他标签页内容 */}
          <TabsContent value="characters">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.length > 0 ? (
                characters.map((character: any) => (
                  <Card key={character.id}>
                    <CardHeader>
                      <CardTitle>{character.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-3">{character.description}</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/story/${storyId}/character/${character.id}`}>查看详情</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="py-10 text-center col-span-full">
                  <p className="mb-4 text-muted-foreground">还没有角色，开始创建吧！</p>
                  <Button asChild>
                    <Link href={`/story/${storyId}/character/new`}>创建角色</Link>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="outline">
            {outline ? (
              <Card>
                <CardHeader>
                  <CardTitle>故事大纲</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {outlineSections.map((section, index) => (
                      <div key={index}>
                        <h3 className="text-lg font-semibold">{section.title || `第${index + 1}章`}</h3>
                        <p className="whitespace-pre-wrap">{section.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/story/${storyId}/outline/edit`}>编辑大纲</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="py-10 text-center">
                <p className="mb-4 text-muted-foreground">还没有创建大纲</p>
                <Button asChild>
                  <Link href={`/story/${storyId}/outline/new`}>创建大纲</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chapters">
            <div className="space-y-4">
              {chapters.length > 0 ? (
                chapters.map((chapter: any) => (
                  <Card key={chapter.id}>
                    <CardHeader>
                      <CardTitle>{chapter.title || `第${chapter.order}章`}</CardTitle>
                      <CardDescription>{chapter.content ? `${chapter.content.length} 字符` : "尚未开始"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2">{chapter.summary || chapter.content?.substring(0, 100) || "暂无内容"}</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/story/${storyId}/chapter/${chapter.id}`}>{chapter.content ? "继续编辑" : "开始写作"}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="mb-4 text-muted-foreground">还没有章节，从大纲自动创建或手动添加</p>
                  <div className="flex justify-center gap-4">
                    <Button asChild variant="outline">
                      <Link href={`/story/${storyId}/chapter/new`}>手动添加</Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/story/${storyId}/chapter/generate-from-outline`}>从大纲生成</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
