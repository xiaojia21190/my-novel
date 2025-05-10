"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { StoryNavigation } from "@/components/StoryNavigation";
import { CharacterCard } from "@/components/CharacterCard";
import { CharacterForm } from "@/components/CharacterForm";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Search, Loader2, RefreshCw, Filter, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStory, getStoryCharacters, createCharacter, updateCharacter, deleteCharacter, generateCharacter } from "@/lib/api-service";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  description?: string | null;
  attributes?: string | null;
}

interface Story {
  id: string;
  title: string;
}

export default function CharactersPage() {
  const { id } = useParams() as { id: string };
  const [characters, setCharacters] = useState<Character[]>([]);
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);

  // 获取故事和角色数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const storyData = await getStory(id);
        setStory(storyData);

        const charactersData = await getStoryCharacters(id);
        setCharacters(charactersData);
      } catch (error) {
        console.error("获取角色数据失败:", error);
        toast.error("加载角色数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // 处理角色搜索
  const filteredCharacters = characters.filter((character) => character.name.toLowerCase().includes(searchQuery.toLowerCase()) || (character.description && character.description.toLowerCase().includes(searchQuery.toLowerCase())));

  // 打开新角色表单
  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setShowForm(true);
  };

  // 编辑角色
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setShowForm(true);
  };

  // 准备删除角色
  const handlePrepareDelete = (characterId: string) => {
    setCharacterToDelete(characterId);
    setShowDeleteDialog(true);
  };

  // 确认删除角色
  const handleConfirmDelete = async () => {
    if (!characterToDelete) return;

    try {
      await deleteCharacter(characterToDelete);
      setCharacters(characters.filter((c) => c.id !== characterToDelete));
      toast.success("角色已删除");
      setShowDeleteDialog(false);
      setCharacterToDelete(null);
    } catch (error) {
      console.error("删除角色失败:", error);
      toast.error("删除角色失败");
    }
  };

  // 提交角色表单
  const handleSubmitCharacter = async (data: any) => {
    try {
      if (data.id) {
        // 更新现有角色
        const updatedCharacter = await updateCharacter(data.id, {
          name: data.name,
          description: data.description,
          attributes: JSON.stringify(data.attributes),
        });

        setCharacters(characters.map((c) => (c.id === data.id ? updatedCharacter : c)));
      } else {
        // 创建新角色
        const newCharacter = await createCharacter(id, {
          name: data.name,
          description: data.description,
          attributes: JSON.stringify(data.attributes),
        });

        setCharacters([...characters, newCharacter]);
      }

      setShowForm(false);
      setEditingCharacter(null);
    } catch (error) {
      console.error("保存角色失败:", error);
      toast.error("保存角色失败");
    }
  };

  // 使用AI生成角色
  const handleGenerateCharacter = async () => {
    try {
      setIsGenerating(true);
      const prompt = "为我的小说生成一个有趣且具有深度的角色";
      const generatedCharacter = await generateCharacter(id, prompt);

      setCharacters([...characters, generatedCharacter]);
      toast.success("AI已生成新角色");
    } catch (error) {
      console.error("生成角色失败:", error);
      toast.error("生成角色失败");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* 左侧导航 */}
      <div className="w-64 shrink-0">
        <StoryNavigation storyId={id} storyTitle={story?.title} />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* 标题区域 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">角色管理</h1>
                <p className="text-muted-foreground">创建和管理你的故事角色</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleGenerateCharacter} disabled={isGenerating} className="gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI生成角色
                    </>
                  )}
                </Button>
                <Button onClick={handleAddCharacter} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  添加角色
                </Button>
              </div>
            </div>

            {/* 搜索和过滤区域 */}
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 text-muted-foreground left-3 top-3" />
                <Input placeholder="搜索角色..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="w-4 h-4" />
                      排序
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setCharacters([...characters].sort((a, b) => a.name.localeCompare(b.name)))}>按名称排序 (A-Z)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCharacters([...characters].sort((a, b) => b.name.localeCompare(a.name)))}>按名称排序 (Z-A)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </Button>
              </div>
            </div>

            {/* 角色列表 */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">加载角色中...</p>
              </div>
            ) : filteredCharacters.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCharacters.map((character) => (
                  <CharacterCard key={character.id} character={character} storyId={id} onEdit={handleEditCharacter} onDelete={handlePrepareDelete} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Users className="w-12 h-12 mb-4 text-muted-foreground" />
                  {searchQuery ? (
                    <p className="mb-4 text-center text-muted-foreground">没有找到匹配 "{searchQuery}" 的角色</p>
                  ) : (
                    <>
                      <p className="mb-4 text-center text-muted-foreground">你的故事还没有角色。添加角色可以让你的故事更加丰富。</p>
                      <Button onClick={handleAddCharacter} className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        添加第一个角色
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 角色表单对话框 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingCharacter ? "编辑角色" : "创建新角色"}</DialogTitle>
            <DialogDescription>{editingCharacter ? "修改角色信息" : "添加一个新的角色到你的故事中"}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="px-1 py-2">
              <CharacterForm storyId={id} initialData={editingCharacter || undefined} onSubmit={handleSubmitCharacter} onCancel={() => setShowForm(false)} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>你确定要删除这个角色吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
