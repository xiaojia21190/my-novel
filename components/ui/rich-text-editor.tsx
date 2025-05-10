"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Highlighter, Heading1, Heading2, ListOrdered, List, Quote } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  maxCharacterCount?: number;
}

export const RichTextEditor = ({ content, onChange, placeholder = "开始输入...", className, maxCharacterCount }: RichTextEditorProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

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
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4 focus:outline-none max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setCharacterCount(editor.storage.characterCount.characters());
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {editor && (
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

      <div className="flex flex-wrap gap-1 px-3 py-2 border-b bg-muted/30">
        {editor && (
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

      <EditorContent editor={editor} className="px-3 py-2 min-h-[300px]" />

      {maxCharacterCount && (
        <div className="px-3 py-1 text-xs border-t text-muted-foreground bg-muted/30">
          {characterCount} / {maxCharacterCount} 字符
        </div>
      )}
    </div>
  );
};
