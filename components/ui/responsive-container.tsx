"use client";

import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  // 响应式显示类型
  mobileDisplay?: "stack" | "scroll" | "collapse" | "hybrid";
  // 紧凑模式下的间距
  compactSpacing?: boolean;
  // 最小高度
  minHeight?: string;
  // 是否启用网格布局
  grid?: boolean;
  // 默认的网格列数
  gridCols?: 1 | 2 | 3 | 4;
  // 移动端的网格列数
  mobileGridCols?: 1 | 2;
  // 平板的网格列数
  tabletGridCols?: 1 | 2 | 3;
  // 桌面的网格列数
  desktopGridCols?: 1 | 2 | 3 | 4;
}

export function ResponsiveContainer({ children, className, mobileDisplay = "stack", compactSpacing = false, minHeight, grid = false, gridCols = 1, mobileGridCols = 1, tabletGridCols = 2, desktopGridCols = 3 }: ResponsiveContainerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // sm 断点
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024); // md 断点
    };

    // 初始检查
    checkScreenSize();

    // 添加监听
    window.addEventListener("resize", checkScreenSize);

    // 清理监听
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // 获取当前设备的网格列数
  const getCurrentGridCols = () => {
    if (grid) {
      if (isMobile) return mobileGridCols;
      if (isTablet) return tabletGridCols;
      return desktopGridCols;
    }
    return gridCols;
  };

  // 计算间距类
  const getSpacingClass = () => {
    if (compactSpacing) {
      return isMobile ? "space-y-2" : "space-y-3";
    }
    return isMobile ? "space-y-4" : "space-y-6";
  };

  // 构建容器类名
  const containerClasses = cn(
    // 基础样式
    "w-full transition-all",

    // 设置最小高度
    minHeight && `min-h-[${minHeight}]`,

    // 网格布局
    grid && `grid gap-4`,
    grid && `grid-cols-${getCurrentGridCols()}`,

    // 移动端显示方式
    !grid && mobileDisplay === "stack" && getSpacingClass(),
    !grid && mobileDisplay === "scroll" && "flex",
    !grid && mobileDisplay === "scroll" && (isMobile ? "flex-row overflow-x-auto pb-2" : "flex-col space-y-4"),
    !grid && mobileDisplay === "hybrid" && (isMobile ? "flex flex-col space-y-3" : "grid grid-cols-2 lg:grid-cols-3 gap-4"),
    !grid && mobileDisplay === "collapse" && "flex flex-col",

    // 自定义类名
    className
  );

  return <div className={containerClasses}>{children}</div>;
}

// 响应式项组件，用于配合ResponsiveContainer使用
interface ResponsiveItemProps {
  children: ReactNode;
  className?: string;
  // 在移动设备上是否隐藏
  hideOnMobile?: boolean;
  // 在平板设备上是否隐藏
  hideOnTablet?: boolean;
  // 在桌面设备上是否隐藏
  hideOnDesktop?: boolean;
  // 移动端优先级 (越小越靠前)
  mobilePriority?: number;
}

export function ResponsiveItem({ children, className, hideOnMobile = false, hideOnTablet = false, hideOnDesktop = false, mobilePriority }: ResponsiveItemProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // 检查当前设备是否应该隐藏
  if ((isMobile && hideOnMobile) || (isTablet && hideOnTablet) || (!isMobile && !isTablet && hideOnDesktop)) {
    return null;
  }

  const itemClasses = cn("transition-all", mobilePriority !== undefined && isMobile && `order-${mobilePriority}`, className);

  return <div className={itemClasses}>{children}</div>;
}
