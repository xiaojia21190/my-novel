"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  attribute?: string;
}

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeContextType = {
  theme: "system",
  setTheme: () => null,
};

const ThemeContext = createContext<ThemeContextType>(initialState);

export function ThemeProvider({ children, defaultTheme = "system", enableSystem = true, disableTransitionOnChange = false, attribute = "data-theme" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    // 删除旧的数据主题属性
    root.removeAttribute(attribute);

    // 检查如果是系统主题，确定实际的暗/亮模式
    if (theme === "system" && enableSystem) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }

    // 添加当前主题类
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    // 添加数据属性
    root.setAttribute(attribute, theme);
  }, [theme, attribute, enableSystem]);

  // 处理系统主题变化
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, enableSystem]);

  // 处理过渡动画
  useEffect(() => {
    if (disableTransitionOnChange) return;

    document.documentElement.classList.add("[transition:color_0.3s,background-color_0.3s]");
    return () => {
      document.documentElement.classList.remove("[transition:color_0.3s,background-color_0.3s]");
    };
  }, [disableTransitionOnChange]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
