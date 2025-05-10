import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { createAuthErrorResponse } from '@/lib/api-error-handler';

// Clerk中间件处理所有认证相关功能
const authMiddleware = clerkMiddleware();

export default function middleware(req: NextRequest) {
  // 如果是受保护的路由，验证用户是否已登录
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);

  // 设置请求开始时间，用于性能分析
  requestHeaders.set('x-request-start', Date.now().toString());

  // 对受保护的API路由进行验证：
  // 1. 以/api/user开头的路由 (除了公开的路由)
  // 2. 以/api/protected开头的路由
  // 3. 其他需要保护的API路由
  if (
    (pathname.startsWith('/api/user') && pathname !== '/api/user/public') ||
    pathname.startsWith('/api/protected') ||
    pathname.startsWith('/api/generate')
  ) {
    const { userId } = getAuth(req);

    // 如果用户未登录，返回标准化的401错误
    if (!userId) {
      // 判断请求类型，返回适当的错误响应
      const acceptHeader = req.headers.get('accept');
      if (acceptHeader && acceptHeader.includes('application/json')) {
        return createAuthErrorResponse('您必须登录才能访问此资源');
      }

      // 非JSON请求也提供结构化响应
      return new NextResponse(
        JSON.stringify({
          error: "未授权",
          message: "您必须登录才能访问此资源",
          statusCode: 401,
          timestamp: new Date().toISOString(),
          path: pathname
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 添加用户ID到请求头，方便后续处理
    requestHeaders.set('x-user-id', userId);
  }

  // 对受保护的页面路由进行验证
  // 例如：个人资料页、仪表板等
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/protected') ||
    pathname.startsWith('/story') && !pathname.startsWith('/story/public')
  ) {
    const { userId } = getAuth(req);

    // 如果用户未登录，重定向到登录页
    if (!userId) {
      const signInUrl = new URL('/signin', req.url);

      // 保存当前URL作为重定向目标，登录后返回
      signInUrl.searchParams.set('redirect_url', pathname + req.nextUrl.search);

      // 设置重定向原因，前端可以显示适当的消息
      signInUrl.searchParams.set('reason', 'protected_route');

      return NextResponse.redirect(signInUrl);
    }

    // 添加用户ID到请求头
    requestHeaders.set('x-user-id', userId);
  }

  // 如果请求是针对资源所有权验证的路由（例如特定故事的编辑页面）
  if (pathname.match(/\/story\/[^\/]+\/(edit|delete)/)) {
    const { userId } = getAuth(req);

    // 如果用户未登录
    if (!userId) {
      const signInUrl = new URL('/signin', req.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      signInUrl.searchParams.set('reason', 'ownership_required');
      return NextResponse.redirect(signInUrl);
    }

    // 注意：实际的所有权验证在API层或页面组件中进行
    // 这里只进行基本的认证检查
    requestHeaders.set('x-user-id', userId);
  }

  // 添加响应头增强，支持错误处理
  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  // 设置错误页面路径，当发生某些错误时用于客户端重定向
  response.headers.set('x-error-page', '/error');

  // 继续使用Clerk中间件处理请求
  // @ts-expect-error - Clerk中间件类型定义问题
  return authMiddleware(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Run for protected routes
    '/dashboard(.*)',
    '/profile(.*)',
    '/protected(.*)',
    '/story(.*)',
  ],
};
