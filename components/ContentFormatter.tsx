/**
 * 内容格式转换工具
 *
 * 用于处理富文本编辑器内容与后端存储格式之间的转换
 */

/**
 * 将 HTML 格式内容安全地转换为后端存储格式
 * @param htmlContent 富文本编辑器的 HTML 内容
 * @returns 适合后端存储的内容
 */
export function formatHtmlForStorage(htmlContent: string): string {
  if (!htmlContent) return "";

  // 删除可能的空白行
  let content = htmlContent
    .replace(/<p>\s*<\/p>/g, "") // 移除空段落
    .replace(/\n\s*\n/g, "\n"); // 移除多余的换行

  return content;
}

/**
 * 将后端存储的内容转换为富文本编辑器可用的 HTML 格式
 * @param storedContent 后端存储的内容
 * @returns 富文本编辑器可用的 HTML 内容
 */
export function formatStoredContentToHtml(storedContent: string): string {
  if (!storedContent) return "";

  // 确保内容是有效的 HTML
  if (!storedContent.trim().startsWith("<")) {
    // 如果不是 HTML 格式，将纯文本转换为 HTML
    return `<p>${storedContent.split("\n\n").join("</p><p>")}</p>`.replace(/\n(?!<\/p>|$)/g, "<br />");
  }

  return storedContent;
}

/**
 * 获取内容的纯文本版本（移除所有 HTML 标签）
 * @param htmlContent HTML 内容
 * @returns 纯文本内容
 */
export function getPlainTextFromHtml(htmlContent: string): string {
  if (!htmlContent) return "";

  // 创建一个临时 DOM 元素来解析 HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  // 获取纯文本
  return tempDiv.textContent || tempDiv.innerText || "";
}

/**
 * 统计字数
 * @param content 内容（HTML 或纯文本）
 * @param isHtml 内容是否为 HTML 格式
 * @returns 字数
 */
export function countWords(content: string, isHtml: boolean = true): number {
  if (!content) return 0;

  // 如果是 HTML，先转换为纯文本
  const text = isHtml ? getPlainTextFromHtml(content) : content;

  // 移除空白字符并计算字数（简单方法）
  return text.trim().replace(/\s+/g, " ").split(" ").length;
}

/**
 * 检查内容是否为 HTML 格式
 * @param content 要检查的内容
 * @returns 是否为 HTML 格式
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  return /<\/?[a-z][\s\S]*>/i.test(content);
}
