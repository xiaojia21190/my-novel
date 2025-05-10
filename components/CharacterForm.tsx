"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save, X, Sparkles } from "lucide-react";
import { generateCharacterDescription } from "@/lib/api-service";
import { toast } from "sonner";

// 验证模式
const characterSchema = z.object({
  name: z.string().min(1, "角色名称不能为空"),
  description: z.string().optional(),
  // 不在这里验证attributes，因为它们是动态的
});

type FormValues = z.infer<typeof characterSchema> & {
  attributes: Record<string, string>;
};

interface CharacterFormProps {
  storyId: string;
  initialData?: {
    id?: string;
    name: string;
    description?: string | null;
    attributes?: string | null;
  };
  onSubmit: (data: FormValues & { id?: string }) => Promise<void>;
  onCancel: () => void;
}

export function CharacterForm({ storyId, initialData, onSubmit, onCancel }: CharacterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  // 初始化表单
  const form = useForm<FormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      attributes: {},
    },
  });

  // 处理属性初始化
  useEffect(() => {
    if (initialData?.attributes) {
      try {
        const parsedAttrs = JSON.parse(initialData.attributes);
        setAttributes(parsedAttrs);
      } catch (error) {
        console.error("解析角色属性失败:", error);
        setAttributes({});
      }
    }
  }, [initialData]);

  // 提交表单
  const handleSubmit = async (values: z.infer<typeof characterSchema>) => {
    try {
      setIsLoading(true);
      // 合并表单值和属性
      await onSubmit({
        ...values,
        id: initialData?.id,
        attributes,
      });
      toast.success(initialData?.id ? "角色已更新" : "角色已创建");
    } catch (error) {
      console.error("提交角色表单失败:", error);
      toast.error("保存角色失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新属性
  const addAttribute = () => {
    if (newAttrKey.trim() && newAttrValue.trim()) {
      setAttributes((prev) => ({
        ...prev,
        [newAttrKey.trim()]: newAttrValue.trim(),
      }));
      setNewAttrKey("");
      setNewAttrValue("");
    }
  };

  // 删除属性
  const removeAttribute = (key: string) => {
    setAttributes((prev) => {
      const newAttrs = { ...prev };
      delete newAttrs[key];
      return newAttrs;
    });
  };

  // 使用AI生成角色描述
  const generateAIDescription = async () => {
    const name = form.getValues("name");
    if (!name) {
      toast.error("请先输入角色名称");
      return;
    }

    try {
      setIsGenerating(true);
      // 构建提示，包含属性信息
      let prompt = `为名叫"${name}"的小说角色创建一个详细的人物描述`;

      if (Object.keys(attributes).length > 0) {
        prompt += "，角色具有以下属性：\n";
        Object.entries(attributes).forEach(([key, value]) => {
          prompt += `- ${key}: ${value}\n`;
        });
      }

      const description = await generateCharacterDescription(prompt);
      form.setValue("description", description);
      toast.success("角色描述已生成");
    } catch (error) {
      console.error("生成角色描述失败:", error);
      toast.error("生成角色描述失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-primary/20">
      <CardHeader className="pb-4 space-y-1 border-b bg-muted/30">
        <CardTitle>{initialData?.id ? "编辑角色" : "创建新角色"}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="p-6 space-y-5">
            {/* 角色名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入角色名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 角色描述 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>角色描述</FormLabel>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1" onClick={generateAIDescription} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      生成中
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      AI生成
                    </>
                  )}
                </Button>
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="描述角色的外貌、性格、背景故事等" className="min-h-28" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 角色属性 */}
            <div className="space-y-3">
              <FormLabel>角色属性</FormLabel>

              {/* 已添加的属性 */}
              {Object.keys(attributes).length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center p-2 border rounded-md gap-2 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{key}</p>
                        <p className="text-sm truncate">{value}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => removeAttribute(key)}>
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 添加新属性 */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input placeholder="属性名称 (例如: 年龄、职业)" value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)} className="flex-1" />
                <Input placeholder="属性值 (例如: 25岁、侦探)" value={newAttrValue} onChange={(e) => setNewAttrValue(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" onClick={addAttribute} disabled={!newAttrKey.trim() || !newAttrValue.trim()}>
                  添加
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between p-6 border-t bg-muted/20">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存角色
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
