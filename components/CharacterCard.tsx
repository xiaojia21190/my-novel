"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, User, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface Character {
  id: string;
  name: string;
  description?: string | null;
  attributes?: string | null; // JSON格式的属性
}

interface CharacterCardProps {
  character: Character;
  storyId: string;
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
}

export function CharacterCard({ character, storyId, onEdit, onDelete }: CharacterCardProps) {
  const [expanded, setExpanded] = useState(false);

  // 解析角色属性（如果有）
  const attributes = character.attributes ? JSON.parse(character.attributes) : {};

  return (
    <Card className="w-full overflow-hidden transition-all duration-300 border-2 shadow-md hover:shadow-lg hover:border-primary/40">
      <CardHeader className="p-4 pb-2 bg-muted/30">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold truncate">{character.name}</span>
          </div>
          <Button variant="ghost" size="sm" className="p-1 h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {/* 角色描述摘要，始终显示 */}
        <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>{character.description || "无角色描述"}</p>

        {/* 展开后显示的详细信息 */}
        {expanded && (
          <div className="mt-3 space-y-3 animate-fadeIn">
            {/* 角色属性 */}
            {Object.keys(attributes).length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground">角色属性</h4>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(attributes).map(([key, value]) => (
                    <Badge variant="outline" key={key} className="text-xs">
                      {key}: {value as string}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 在故事中的出场章节 */}
            <div className="pt-2">
              <Link href={`/story/${storyId}/character/${character.id}`} className="text-xs text-primary hover:underline">
                查看角色详情
              </Link>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 p-3 border-t bg-muted/10 border-border/30">
        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => onEdit(character)}>
          <Edit className="w-3.5 h-3.5" />
          编辑
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => onDelete(character.id)}>
          <Trash2 className="w-3.5 h-3.5" />
          删除
        </Button>
      </CardFooter>
    </Card>
  );
}
