"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 防抖函数
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 节流函数
function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const remaining = delay - (now - lastExecuted.current);

    if (remaining <= 0) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, remaining);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay]);

  return throttledValue;
}

// 编辑器优化状态接口
export interface EditorOptimizedState<T> {
  value: T;
  debouncedValue: T;
  throttledValue: T;
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  markSaved: () => void;
}

// 自定义钩子，优化编辑器状态
export function useOptimizedEditorState<T>(initialValue: T, debounceDelay: number = 500, throttleDelay: number = 300): EditorOptimizedState<T> {
  // 状态
  const [value, setValue] = useState<T>(initialValue);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 应用防抖和节流
  const debouncedValue = useDebounce(value, debounceDelay);
  const throttledValue = useThrottle(value, throttleDelay);

  // 更新值
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    setIsDirty(true);
  }, []);

  // 标记为已保存
  const markSaved = useCallback(() => {
    setIsDirty(false);
    setLastSaved(new Date());
  }, []);

  // 当初始值变化时更新内部状态
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    debouncedValue,
    throttledValue,
    isDirty,
    setIsDirty,
    lastSaved,
    setLastSaved,
    markSaved,
  };
}

// 自适应自动保存组件属性
interface AutoSaveProps<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  throttleInterval?: number;
  saveOnBlur?: boolean;
  minimumSaveInterval?: number;
  children: (props: { isDirty: boolean; lastSaved: Date | null; formattedLastSaved: string; manualSave: () => Promise<void> }) => React.ReactNode;
}

// 自适应自动保存组件
export function AutoSave<T>({
  value,
  onSave,
  throttleInterval = 60000, // 默认每分钟
  saveOnBlur = true,
  minimumSaveInterval = 5000, // 两次保存最小间隔（毫秒）
  children,
}: AutoSaveProps<T>) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSavedValue, setLastSavedValue] = useState<T>(value);
  const lastSaveAttempt = useRef<number>(0);
  const valueRef = useRef<T>(value);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 更新引用值
  useEffect(() => {
    valueRef.current = value;

    // 检测值是否已更改
    const hasChanged = JSON.stringify(value) !== JSON.stringify(lastSavedValue);
    if (hasChanged) {
      setIsDirty(true);
    }
  }, [value, lastSavedValue]);

  // 保存逻辑
  const save = useCallback(async () => {
    const now = Date.now();

    // 防止过于频繁的保存
    if (now - lastSaveAttempt.current < minimumSaveInterval) {
      return;
    }

    lastSaveAttempt.current = now;

    // 如果没有更改，不需要保存
    if (!isDirty) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(valueRef.current);
      setLastSavedValue(valueRef.current);
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error("自动保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, minimumSaveInterval, onSave]);

  // 手动保存函数
  const manualSave = useCallback(async () => {
    await save();
  }, [save]);

  // 自动保存定时器
  useEffect(() => {
    if (isDirty && !isSaving) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(save, throttleInterval);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, isSaving, throttleInterval, save]);

  // 失去焦点时保存
  useEffect(() => {
    if (!saveOnBlur) return;

    const handleBlur = () => {
      if (isDirty && !isSaving) {
        save();
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [isDirty, isSaving, save, saveOnBlur]);

  // 格式化上次保存时间
  const formattedLastSaved = (() => {
    if (!lastSaved) return "未保存";

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000); // seconds

    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;

    return lastSaved.toLocaleString();
  })();

  // 渲染子组件
  return children({
    isDirty,
    lastSaved,
    formattedLastSaved,
    manualSave,
  });
}
