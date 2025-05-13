"use client";

import React, { useEffect, useRef, useState } from "react";
import { Editor, EditorContent } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface VirtualizedEditorContentProps {
  editor: Editor | null;
  className?: string;
  viewportHeight?: number | string;
  bufferSize?: number; // 缓冲区大小（段落数）
}

/**
 * 虚拟化编辑器内容组件
 *
 * 这个组件仅在查看大型文档时使用，通过仅渲染可见区域附近的内容来提高性能。
 * 注意：此组件不适用于编辑模式，仅适用于阅读/预览模式。
 */
export const VirtualizedEditorContent: React.FC<VirtualizedEditorContentProps> = ({ editor, className, viewportHeight = 500, bufferSize = 5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleContent, setVisibleContent] = useState<string>("");
  const [isScrolling, setIsScrolling] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 0]);

  // 解析编辑器内容为段落
  useEffect(() => {
    if (!editor) return;

    // 获取编辑器内容
    const content = editor.getHTML();

    // 简单的段落分割（实际项目可能需要更复杂的逻辑）
    // 这里以 <p>, <h1>-<h6>, <li>, <blockquote> 等块级元素作为分隔
    const regex = /(<p>.*?<\/p>|<h[1-6]>.*?<\/h[1-6]>|<li>.*?<\/li>|<blockquote>.*?<\/blockquote>|<div>.*?<\/div>)/g;
    const matches = content.match(regex) || [];

    // 如果没有匹配到段落，将整个内容作为一个段落
    if (matches.length === 0 && content.trim()) {
      setParagraphs([content]);
    } else {
      setParagraphs(matches);
    }
  }, [editor]);

  // 处理滚动事件，计算可见范围
  useEffect(() => {
    if (!containerRef.current || paragraphs.length === 0) return;

    const container = containerRef.current;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (!isScrolling) {
        setIsScrolling(true);
      }

      // 清除之前的定时器
      clearTimeout(scrollTimeout);

      // 计算可见范围
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // 假设每个段落的平均高度为100px（实际应用中可能需要更精确的计算）
      const avgParagraphHeight = 100;
      const totalHeight = paragraphs.length * avgParagraphHeight;

      // 计算可见范围的起始和结束段落索引
      const startIdx = Math.max(0, Math.floor(scrollTop / avgParagraphHeight) - bufferSize);
      const endIdx = Math.min(paragraphs.length - 1, Math.ceil((scrollTop + containerHeight) / avgParagraphHeight) + bufferSize);

      setVisibleRange([startIdx, endIdx]);

      // 滚动结束后重置状态
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    // 初始计算
    handleScroll();

    // 添加滚动监听
    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [paragraphs, bufferSize, isScrolling]);

  // 基于可见范围渲染内容
  useEffect(() => {
    if (paragraphs.length === 0) return;

    const [startIdx, endIdx] = visibleRange;

    // 仅渲染可见范围内的段落
    const visibleParagraphs = paragraphs.slice(startIdx, endIdx + 1);
    const content = visibleParagraphs.join("");

    setVisibleContent(content);
  }, [paragraphs, visibleRange]);

  // 如果没有编辑器实例，返回空
  if (!editor) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto relative", className)}
      style={{
        height: typeof viewportHeight === "number" ? `${viewportHeight}px` : viewportHeight,
        // 设置内容容器的总高度，保持正确的滚动范围
        position: "relative",
      }}
    >
      {/* 完整高度占位元素，用于保持正确的滚动范围 */}
      <div
        style={{
          height: paragraphs.length * 100, // 假设每个段落的平均高度为100px
          position: "absolute",
          width: "1px",
          opacity: 0,
        }}
      />

      {/* 虚拟化内容区域 */}
      <div
        style={{
          position: "absolute",
          top: visibleRange[0] * 100, // 基于第一个可见段落的位置
          width: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: visibleContent }}
        className="prose prose-sm sm:prose dark:prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4 max-w-none"
      />

      {/* 滚动指示器 */}
      {isScrolling && <div className="fixed bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-md text-sm">滚动中...</div>}
    </div>
  );
};

/**
 * 虚拟化编辑器组件
 * 用于优化大型文档的性能
 */
export function VirtualizedEditor({ editor, className, viewportHeight = 500, isEditable = false }: { editor: Editor | null; className?: string; viewportHeight?: number | string; isEditable?: boolean }) {
  // 如果是可编辑模式，使用标准EditorContent
  if (isEditable) {
    return <EditorContent editor={editor} className={className} />;
  }

  // 如果是只读模式，使用虚拟化内容
  return <VirtualizedEditorContent editor={editor} className={className} viewportHeight={viewportHeight} />;
}
