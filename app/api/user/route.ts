import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";

// 获取当前用户信息的API
export async function GET() {
  try {
    // 获取当前用户
    const user = await getCurrentDbUser();

    // 如果用户未登录，返回401未授权
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 返回用户信息
    return NextResponse.json({ user });
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
  }
}
