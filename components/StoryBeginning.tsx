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
  {
    id: 5,
    title: "历史传奇",
    content: "1862年的长安城，一位年轻的刺客站在高楼之上，俯瞰着灯火辉煌的皇宫，今夜他将改变历史。",
    icon: "🏯",
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
    <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn">
      {/* 预设开头 */}
      <div>
        <h2 className="flex items-center justify-center mb-8 text-3xl font-bold text-center">
          <BookOpen className="w-8 h-8 mr-3 text-primary" />
          选择一个故事开头
        </h2>
        <div className="grid grid-cols-3 gap-8">
          {presetBeginnings.map((beginning) => (
            <Card key={beginning.id} className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] border-2 bg-card/80">
              <CardContent className="p-0">
                <div className="flex items-center px-6 py-4 border-b bg-gradient-to-r from-primary/20 to-secondary/10">
                  <span className="mr-3 text-3xl">{beginning.icon}</span>
                  <h3 className="text-xl font-semibold text-primary">{beginning.title}</h3>
                </div>
                <div className="p-6">
                  <p className="m-10 text-base leading-relaxed text-muted-foreground">{beginning.content}</p>
                  <Button className="w-full py-6 mt-4 text-base shadow-md" onClick={() => onSelectBeginning(beginning.content)}>
                    选择此开头
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-8 text-base bg-background text-muted-foreground">或者</span>
        </div>
      </div>

      {/* 自定义开头 */}
      <div>
        <h2 className="flex items-center justify-center mb-8 text-3xl font-bold text-center">
          <PenLine className="w-8 h-8 mr-3 text-secondary" />
          创作自定义开头
        </h2>
        <Card className="overflow-hidden border-2 shadow-xl bg-card/80">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-4">
              <Label htmlFor="customBeginning" className="flex items-center text-lg font-medium">
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
                className="min-h-[240px] resize-y p-5 text-lg border-2 focus:border-primary/30 shadow-md"
              />
              {customError && <p className="text-base font-medium text-destructive">{customError}</p>}
              <div className="p-4 rounded-md bg-muted/30">
                <p className="flex items-center justify-between text-base">
                  <span>
                    当前字数: <span className="font-medium">{customBeginning.length}</span>
                  </span>
                  <span className={customBeginning.length < 100 || customBeginning.length > 500 ? "text-destructive font-medium" : "text-success font-medium"}>
                    {customBeginning.length < 100 ? "至少还需" + (100 - customBeginning.length) + "字" : customBeginning.length > 500 ? "超出" + (customBeginning.length - 500) + "字" : "字数合适"}
                  </span>
                </p>
                <div className="w-full h-3 mt-3 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all ${customBeginning.length < 100 ? "bg-destructive/50 w-[" + customBeginning.length / 5 + "%]" : customBeginning.length > 500 ? "bg-destructive w-full" : "bg-success w-[" + customBeginning.length / 5 + "%]"}`}></div>
                </div>
              </div>
            </div>
            <Button onClick={handleCustomBeginningSubmit} disabled={customBeginning.length < 100 || customBeginning.length > 500} className="w-full text-lg font-medium transition-all shadow-lg py-7 hover:shadow-xl" size="lg">
              使用自定义开头
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
