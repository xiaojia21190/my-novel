"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, PenLine, BookOpen } from "lucide-react";

// 预设开头内容
const presetBeginnings = [
  {
    id: 1,
    title: "奇幻冒险",
    content: "在一个被迷雾笼罩的古老森林中，年轻的冒险者艾琳发现了一块散发微光的魔法石。",
    icon: "🧙‍♂️",
  },
  {
    id: 2,
    title: "科幻未来",
    content: '公元2375年，地球殖民地"曙光号"接收到一则来自未知星系的神秘信号。',
    icon: "🚀",
  },
  {
    id: 3,
    title: "悬疑探案",
    content: "深夜的小镇，图书馆的灯光突然熄灭，一声尖叫打破了寂静。",
    icon: "🔍",
  },
  {
    id: 4,
    title: "都市情感",
    content: "雨水冲刷着城市的街道，陈默坐在咖啡馆的角落，手指轻轻敲击着桌面，等待着那个改变他一生的人出现。",
    icon: "☕",
  },
];

interface StoryBeginningProps {
  onSelectBeginning: (content: string) => void;
}

export function StoryBeginning({ onSelectBeginning }: StoryBeginningProps) {
  const [customBeginning, setCustomBeginning] = useState<string>("");
  const [customError, setCustomError] = useState<string | null>(null);

  // 处理自定义开头提交
  const handleCustomBeginningSubmit = () => {
    if (customBeginning.length < 100) {
      setCustomError("自定义开头需至少100字");
      return;
    }
    if (customBeginning.length > 500) {
      setCustomError("自定义开头不能超过500字");
      return;
    }
    onSelectBeginning(customBeginning);
    setCustomError(null);
  };

  return (
    <div className="mx-auto max-w-7xl animate-fadeIn">
      {/* 水平分隔线 (仅在移动端显示) */}
      <div className="relative block mb-12 lg:hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-8 text-base bg-background text-muted-foreground">或者</span>
        </div>
      </div>

      {/* 左右两栏布局 */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-12">
        {/* 左侧 - 预设开头 */}
        <div className="mb-12 lg:w-1/2 lg:mb-0">
          <h2 className="flex items-center justify-center mb-6 text-2xl font-bold text-center">
            <BookOpen className="mr-2 w-7 h-7 text-primary" />
            选择一个故事开头
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {presetBeginnings.map((beginning) => (
              <Card key={beginning.id} className="py-0 gap-0 overflow-hidden transition-all duration-300 h-64 flex flex-col hover:shadow-lg hover:translate-y-[-2px] border-2 bg-card/80 cursor-pointer">
                <div className="flex items-center px-4 py-3 border-b bg-gradient-to-r from-primary/20 to-secondary/10">
                  <span className="mr-2 text-2xl">{beginning.icon}</span>
                  <h3 className="text-lg font-semibold text-primary">{beginning.title}</h3>
                </div>
                <div className="flex flex-col justify-between flex-grow p-4">
                  <p className="text-base leading-relaxed text-muted-foreground line-clamp-4">{beginning.content}</p>
                  <Button className="w-full py-2 mt-2 text-base" onClick={() => onSelectBeginning(beginning.content)}>
                    选择此开头
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 中间分隔线 (仅在桌面显示) */}
        <div className="hidden lg:block lg:border-l lg:border-border"></div>

        {/* 右侧 - 自定义开头 */}
        <div className="lg:w-1/2">
          <h2 className="flex items-center justify-center mb-6 text-2xl font-bold text-center">
            <PenLine className="mr-2 w-7 h-7 text-secondary" />
            创作自定义开头
          </h2>
          <Card className="overflow-hidden border-2 shadow-xl bg-card/80">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="customBeginning" className="flex items-center text-base font-medium">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" />
                  你的故事开头（100-500字）
                </Label>
                <Textarea
                  id="customBeginning"
                  value={customBeginning}
                  onChange={(e) => {
                    setCustomBeginning(e.target.value);
                    if (customError) setCustomError(null);
                  }}
                  placeholder="在这里开始你的故事..."
                  className="min-h-[180px] resize-y p-4 text-base border-2 focus:border-primary/30 shadow-md"
                />
                {customError && <p className="text-sm font-medium text-destructive">{customError}</p>}
                <div className="p-3 rounded-md bg-muted/30">
                  <p className="flex items-center justify-between text-sm">
                    <span>
                      当前字数: <span className="font-medium">{customBeginning.length}</span>
                    </span>
                    <span className={customBeginning.length < 100 || customBeginning.length > 500 ? "text-destructive font-medium" : "text-success font-medium"}>
                      {customBeginning.length < 100 ? "至少还需" + (100 - customBeginning.length) + "字" : customBeginning.length > 500 ? "超出" + (customBeginning.length - 500) + "字" : "字数合适"}
                    </span>
                  </p>
                  <div className="w-full h-2 mt-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all ${customBeginning.length < 100 ? "bg-destructive/50 w-[" + customBeginning.length / 5 + "%]" : customBeginning.length > 500 ? "bg-destructive w-full" : "bg-success w-[" + customBeginning.length / 5 + "%]"}`}></div>
                  </div>
                </div>
              </div>
              <Button onClick={handleCustomBeginningSubmit} disabled={customBeginning.length < 100 || customBeginning.length > 500} className="w-full py-2 text-base font-medium transition-all shadow-md cursor-pointer hover:shadow-lg">
                使用自定义开头
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
