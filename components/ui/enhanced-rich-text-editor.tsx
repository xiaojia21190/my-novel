"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Highlighter, Heading1, Heading2, ListOrdered, List, Quote, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Table as TableIcon, Undo, Redo, Bookmark, Save, Eye, Edit2 } from "lucide-react";
import { Progress } from "./progress";
import { toast } from "sonner";

// 导入新的优化组件
import { useOptimizedEditorState, AutoSave } from "./optimized-editor-state";
import { VirtualizedEditor } from "./virtualized-editor-content";

// 分离配置对象以提高可读性和维护性
const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Highlight,
  Placeholder,
  CharacterCount,
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "text-blue-500 underline cursor-pointer",
    },
  }),
  Image.configure({
    allowBase64: true,
    inline: true,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

interface EnhancedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  maxCharacterCount?: number;
  initialMode?: "edit" | "read";
  onSave?: (content: string) => Promise<void>;
  autoSaveInterval?: number; // 毫秒
  minHeight?: string | number;
}

export const EnhancedRichTextEditor = ({
  content,
  onChange,
  placeholder = "开始输入...",
  className,
  maxCharacterCount,
  initialMode = "edit",
  onSave,
  autoSaveInterval = 60000, // 默认1分钟
  minHeight = "300px",
}: EnhancedRichTextEditorProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [mode, setMode] = useState<"edit" | "read">(initialMode);

  // 使用优化的编辑器状态管理
  const editorState = useOptimizedEditorState(content, 500); // 500ms防抖

  // 使用常规扩展配置编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxCharacterCount,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-500 underline cursor-pointer",
        },
      }),
    ],
    content: editorState.value,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4 focus:outline-none max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // 更新本地状态
      onChange(html);
      // 同时更新优化状态
      editorState.setIsDirty(true);
      setCharacterCount(editor.storage.characterCount.characters());
    },
  });

  // 同步外部内容变化
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // 组件挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 切换编辑/阅读模式
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "edit" ? "read" : "edit"));
  }, []);

  // 保存处理器
  const handleSave = useCallback(async () => {
    if (!onSave || !editorState.isDirty) return;
    try {
      await onSave(content);
      editorState.markSaved();
    } catch (error) {
      console.error("保存失败:", error);
    }
  }, [onSave, content, editorState]);

  // 如果组件未挂载，返回空
  if (!isMounted) {
    return null;
  }

  return (
    <div className={cn("border rounded-md overflow-hidden bg-white dark:bg-gray-950", className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex flex-wrap gap-1">
          {editor && mode === "edit" && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-1 h-8", editor.isActive("heading", { level: 1 }) ? "bg-muted" : "")}>
                <Heading1 className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-1 h-8", editor.isActive("heading", { level: 2 }) ? "bg-muted" : "")}>
                <Heading2 className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1 h-8", editor.isActive("bulletList") ? "bg-muted" : "")}>
                <List className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1 h-8", editor.isActive("orderedList") ? "bg-muted" : "")}>
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1 h-8", editor.isActive("blockquote") ? "bg-muted" : "")}>
                <Quote className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSave && (
            <AutoSave value={content} onSave={onSave} throttleInterval={autoSaveInterval} saveOnBlur={true}>
              {({ isDirty, lastSaved, formattedLastSaved, manualSave }) => (
                <div className="flex items-center">
                  {isDirty && (
                    <Button type="button" size="sm" variant="ghost" onClick={manualSave} className="text-xs">
                      保存
                    </Button>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">{isDirty ? "未保存" : `${formattedLastSaved}`}</span>
                </div>
              )}
            </AutoSave>
          )}

          <Button type="button" variant="ghost" size="sm" onClick={toggleMode} title={mode === "edit" ? "查看模式" : "编辑模式"}>
            {mode === "edit" ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {editor && mode === "edit" && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center p-1 bg-white border rounded-md shadow-md dark:bg-gray-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1 h-8 w-8", editor.isActive("bold") ? "bg-muted" : "")}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1 h-8 w-8", editor.isActive("italic") ? "bg-muted" : "")}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1 h-8 w-8", editor.isActive("underline") ? "bg-muted" : "")}>
              <UnderlineIcon className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-1 h-8 w-8", editor.isActive("highlight") ? "bg-muted" : "")}>
              <Highlighter className="w-4 h-4" />
            </Button>
          </div>
        </BubbleMenu>
      )}

      {/* 使用虚拟化编辑器 - 在阅读模式下启用虚拟化 */}
      <div style={{ minHeight }}>
        <VirtualizedEditor editor={editor} className={cn("px-3 py-2", mode === "read" ? "cursor-default" : "")} isEditable={mode === "edit"} viewportHeight={typeof minHeight === "number" ? minHeight : minHeight} />
      </div>

      {maxCharacterCount && (
        <div className="px-3 py-1 text-xs border-t text-muted-foreground bg-muted/30">
          {characterCount} / {maxCharacterCount} 字符
        </div>
      )}
    </div>
  );
};
