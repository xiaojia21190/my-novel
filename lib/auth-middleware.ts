import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from './auth';

/**
 * 保护路由中间件，确保只有登录用户才能访问
 * 使用方法：在API路由处理函数中包装此中间件
 *
 * 例如:
 * export async function GET(req: NextRequest) {
 *   // 检查用户是否已登录
 *   const authResult = await withAuth(req);
 *   if (authResult) {
 *     return authResult; // 未登录，返回401响应
 *   }
 *
 *   // 用户已登录，继续处理请求
 *   return NextResponse.json({ message: "受保护的数据" });
 * }
 */
export async function withAuth(req: NextRequest) {
  const isAuthed = await isAuthenticated();

  if (!isAuthed) {
    return new NextResponse(
      JSON.stringify({
        error: "未授权",
        message: "您必须登录才能访问此资源"
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 返回null表示用户已通过身份验证
  return null;
}

/**
 * 保护路由中间件，确保只有登录用户才能访问
 * 对于非API路由，未登录用户将被重定向到登录页面
 *
 * 例如，在middleware.ts中使用:
 *
 * export function middleware(req: NextRequest) {
 *   if (req.nextUrl.pathname.startsWith('/protected')) {
 *     return withAuthRedirect(req);
 *   }
 * }
 */
export async function withAuthRedirect(req: NextRequest) {
  const isAuthed = await isAuthenticated();

  if (!isAuthed) {
    const url = new URL('/signin', req.url);
    url.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 用户已登录，允许请求继续
  return NextResponse.next();
}
