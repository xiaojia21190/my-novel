/**
 * 自动保存工具函数
 * 提供定时保存和基于事件的保存功能
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// 定义自动保存配置选项类型
export interface AutoSaveOptions {
  interval?: number; // 保存间隔，毫秒
  saveDelay?: number; // 内容变更后延迟保存的时间，毫秒
  minChanges?: number; // 触发保存的最小变更次数
  onSaveStart?: () => void; // 保存开始回调
  onSaveSuccess?: () => void; // 保存成功回调
  onSaveError?: (error: any) => void; // 保存失败回调
  shouldSaveCheck?: (content: string, previousContent: string) => boolean; // 自定义保存条件检查
}

// 定义自动保存钩子返回值类型
interface AutoSaveReturn<T> {
  isSaving: boolean; // 是否正在保存
  lastSaved: Date | null; // 最后保存时间
  forceSave: () => Promise<void>; // 强制保存函数
  savedContent: T; // 已保存的内容
  saveCount: number; // 总保存次数
}

/**
 * 自动保存钩子
 * @param content 要保存的内容
 * @param saveFunction 保存函数，返回Promise
 * @param options 自动保存选项
 * @returns 自动保存相关状态和控制函数
 */
export function useAutoSave<T>(
  content: T,
  saveFunction: (content: T) => Promise<void>,
  options: AutoSaveOptions = {}
): AutoSaveReturn<T> {
  // 提取选项，设置默认值
  const {
    interval = 60000, // 默认每分钟保存一次
    saveDelay = 2000, // 默认变更后2秒保存
    minChanges = 1, // 默认任何变更都保存
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    shouldSaveCheck,
  } = options;

  // 状态管理
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [savedContent, setSavedContent] = useState<T>(content);
  const [saveCount, setSaveCount] = useState(0);
  const [changes, setChanges] = useState(0);

  // 引用存储当前内容和计时器
  const contentRef = useRef<T>(content);
  const changeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // 更新引用内容
  useEffect(() => {
    contentRef.current = content;

    // 如果内容变更，增加变更计数器
    if (JSON.stringify(content) !== JSON.stringify(savedContent)) {
      setChanges(prev => prev + 1);

      // 清除之前的延迟保存计时器
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
      }

      // 设置新的延迟保存计时器
      changeTimerRef.current = setTimeout(() => {
        // 如果变更次数达到阈值，并且当前没有正在进行的保存
        if (changes >= minChanges && !isSavingRef.current) {
          save();
        }
      }, saveDelay);
    }
  }, [content, saveDelay]);

  // 保存函数
  const save = useCallback(async () => {
    // 如果正在保存，直接返回
    if (isSavingRef.current) {
      return;
    }

    // 获取当前内容
    const currentContent = contentRef.current;

    // 如果有自定义保存条件检查，并且检查失败，直接返回
    if (shouldSaveCheck && !shouldSaveCheck(JSON.stringify(currentContent as any), JSON.stringify(savedContent as any))) {
      return;
    }

    // 标记为正在保存
    setIsSaving(true);
    isSavingRef.current = true;

    // 调用保存开始回调
    onSaveStart?.();

    try {
      // 调用保存函数
      await saveFunction(currentContent);

      // 更新保存状态
      setLastSaved(new Date());
      setSavedContent(currentContent);
      setSaveCount(prev => prev + 1);
      setChanges(0);

      // 调用保存成功回调
      onSaveSuccess?.();
    } catch (error) {
      // 调用保存失败回调
      onSaveError?.(error);
      console.error('自动保存失败:', error);
    } finally {
      // 标记为已完成保存
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [saveFunction, onSaveStart, onSaveSuccess, onSaveError, shouldSaveCheck, savedContent]);

  // 强制保存函数
  const forceSave = useCallback(async () => {
    await save();
  }, [save]);

  // 设置定时保存计时器
  useEffect(() => {
    // 清除之前的计时器
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
    }

    // 设置新的计时器
    intervalTimerRef.current = setInterval(() => {
      if (!isSavingRef.current && JSON.stringify(contentRef.current) !== JSON.stringify(savedContent)) {
        save();
      }
    }, interval);

    // 组件卸载时清除计时器
    return () => {
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [interval, save, savedContent]);

  return {
    isSaving,
    lastSaved,
    forceSave,
    savedContent,
    saveCount
  };
}

/**
 * 本地存储管理函数
 * 将内容保存到localStorage
 * @param key localStorage键名
 * @param content 要保存的内容
 */
export function saveToLocalStorage<T>(key: string, content: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({
      content,
      timestamp: new Date().toISOString(),
      version: 'local-' + Date.now()
    }));
  } catch (error) {
    console.error('保存到本地存储失败:', error);
  }
}

/**
 * 从localStorage加载内容
 * @param key localStorage键名
 * @returns 保存的内容，如果不存在则返回null
 */
export function loadFromLocalStorage<T>(key: string): { content: T, timestamp: string, version: string } | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('从本地存储加载失败:', error);
    return null;
  }
}

/**
 * 生成版本标识
 * @returns 唯一的版本ID
 */
export function generateVersionId(): string {
  return `v-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
