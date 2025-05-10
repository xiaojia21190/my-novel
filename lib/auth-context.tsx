"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

// 定义上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  isLoaded: boolean;
}

// 创建上下文
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoaded: false,
});

// 提供认证状态的Provider组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  return <AuthContext.Provider value={{ isAuthenticated: !!isSignedIn, isLoaded }}>{children}</AuthContext.Provider>;
}

// 使用认证状态的钩子
export function useAuthContext() {
  return useContext(AuthContext);
}

// 供非React环境使用的认证状态获取函数（例如工具函数）
// 注意：这是一个hack，如果有更好的方法应该避免使用这种全局变量
let _authState: AuthContextType = {
  isAuthenticated: false,
  isLoaded: false,
};

// 更新认证状态的函数，由AuthProvider调用
export function updateAuthState(state: AuthContextType) {
  _authState = state;
}

// 获取当前认证状态的函数，可以在非React环境中使用
export function getAuthState(): AuthContextType {
  return _authState;
}

// 更新AuthProvider以同时更新全局状态
export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const authState = { isAuthenticated: !!isSignedIn, isLoaded };

  // 更新全局状态
  updateAuthState(authState);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
