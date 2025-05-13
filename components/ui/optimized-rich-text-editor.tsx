"use client";

import { useEffect, useState, useRef, useMemo, memo } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Highlighter, Heading1, Heading2, ListOrdered, List, Quote, Undo, Redo, Save, Eye, Edit2 } from "lucide-react";
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
];

// 使用memo优化按钮组件
const EditorButton = memo(function EditorButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className={cn("p-1 h-8 w-8", active ? "bg-muted" : "")}>
      {children}
    </Button>
  );
});

interface OptimizedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  maxCharacterCount?: number;
  autoSaveInterval?: number; // in milliseconds, default: 30000 (30s)
  readOnly?: boolean; // 是否为只读模式
  viewportHeight?: number | string; // 视口高度
}

export const OptimizedRichTextEditor = ({ content, onChange, onSave, placeholder = "开始输入...", className, maxCharacterCount, autoSaveInterval = 30000, readOnly = false, viewportHeight = 500 }: OptimizedRichTextEditorProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "read">(readOnly ? "read" : "edit");

  // 使用优化的编辑器状态
  const editorState = useOptimizedEditorState(content);

  // 延迟计算单词计数，避免频繁更新
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const wordCountTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 使用memo缓存编辑器配置
  const editorConfig = useMemo(() => {
    return {
      extensions: [
        ...EDITOR_EXTENSIONS,
        Placeholder.configure({
          placeholder,
        }),
        CharacterCount.configure({
          limit: maxCharacterCount,
        }),
      ],
      content,
      editorProps: {
        attributes: {
          class: "prose prose-sm sm:prose dark:prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4 focus:outline-none max-w-none",
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        onChange(html);
        editorState.setIsDirty(true);

        // 更新字符计数
        const characterCount = editor.storage.characterCount.characters();

        // 使用防抖方式更新计数，避免频繁更新
        if (wordCountTimerRef.current) {
          clearTimeout(wordCountTimerRef.current);
        }

        wordCountTimerRef.current = setTimeout(() => {
          // 计算单词数量
          calculateWordCount(editor.getText());
          // 计算估计阅读时间
          calculateReadingTime(editor.getText());
        }, 500);
      },
    };
  }, [content, placeholder, maxCharacterCount, onChange, editorState]);

  // 创建编辑器实例
  const editor = useEditor(editorConfig);

  // 计算单词数量
  const calculateWordCount = (text: string) => {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWordCount(words.length);
  };

  // 计算估计阅读时间
  const calculateReadingTime = (text: string) => {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const minutes = Math.ceil(words.length / 200);
    setReadingTime(minutes);
  };

  // 客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 更新编辑器内容
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // 清理
  useEffect(() => {
    return () => {
      if (wordCountTimerRef.current) {
        clearTimeout(wordCountTimerRef.current);
      }
    };
  }, []);

  // 如果未挂载，返回空
  if (!isMounted) {
    return null;
  }

  // 切换编辑/阅读模式
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "edit" ? "read" : "edit"));
  };

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* 气泡菜单 - 只在编辑模式可见 */}
      {editor && viewMode === "edit" && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center p-1 bg-white border rounded-md shadow-md dark:bg-gray-800">
            <EditorButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="w-4 h-4" />
            </EditorButton>
            <EditorButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="w-4 h-4" />
            </EditorButton>
            <EditorButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="w-4 h-4" />
            </EditorButton>
            <EditorButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
              <Highlighter className="w-4 h-4" />
            </EditorButton>
            <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-gray-600"></div>
            <EditorButton
              active={editor.isActive("link")}
              onClick={() => {
                const url = window.prompt("URL");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
            >
              <LinkIcon className="w-4 h-4" />
            </EditorButton>
          </div>
        </BubbleMenu>
      )}

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 border-b bg-muted/30">
        <div className="flex flex-wrap gap-1">
          {editor && viewMode === "edit" && (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1 h-8">
                <Undo className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1 h-8">
                <Redo className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-gray-600"></div>
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

          {/* 视图模式切换按钮 */}
          <Button type="button" variant="ghost" size="sm" onClick={toggleViewMode} className="p-1 h-8 ml-2" title={viewMode === "edit" ? "切换到阅读模式" : "切换到编辑模式"}>
            {viewMode === "edit" ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* 保存按钮和状态信息 */}
        <div className="flex items-center gap-2">
          {maxCharacterCount && editor && (
            <div className="text-xs text-muted-foreground">
              {editor.storage.characterCount.characters()} / {maxCharacterCount}
            </div>
          )}

          <div className="text-xs text-muted-foreground mr-2">
            {wordCount} 字 · {readingTime} 分钟阅读
          </div>

          <AutoSave value={editor?.getHTML() || ""} onSave={onSave || (() => Promise.resolve())} throttleInterval={autoSaveInterval}>
            {({ isDirty, formattedLastSaved, manualSave }) => (
              <>
                {onSave && (
                  <Button type="button" variant="outline" size="sm" onClick={manualSave} disabled={!isDirty} className="flex items-center gap-1">
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">保存</span>
                  </Button>
                )}
                <span className="text-xs text-muted-foreground hidden sm:inline-block">{formattedLastSaved}</span>
              </>
            )}
          </AutoSave>
        </div>
      </div>

      {/* 根据视图模式使用标准编辑器或虚拟化编辑器 */}
      {viewMode === "edit" ? <EditorContent editor={editor} className="px-3 py-2 min-h-[300px]" /> : <VirtualizedEditor editor={editor} className="px-3 py-2" viewportHeight={viewportHeight} isEditable={false} />}

      {/* 进度条 */}
      {maxCharacterCount && editor && (
        <div className="px-3 py-2 border-t bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {editor.storage.characterCount.characters()} / {maxCharacterCount} 字符
            </span>
            <span className="text-xs text-muted-foreground">{Math.round((editor.storage.characterCount.characters() / maxCharacterCount) * 100)}%</span>
          </div>
          <Progress value={(editor.storage.characterCount.characters() / maxCharacterCount) * 100} className="h-1" />
        </div>
      )}
    </div>
  );
};
