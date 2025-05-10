import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // 获取请求头中的签名，用于验证webhook请求
    // headers()现在返回Promise，需要使用await
    const headersList = await headers();
    const svixId = headersList.get("svix-id");
    const svixTimestamp = headersList.get("svix-timestamp");
    const svixSignature = headersList.get("svix-signature");

    // 如果缺少任何必要的头部信息，返回400错误
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new NextResponse("缺少svix头部信息", { status: 400 });
    }

    // 获取请求体数据
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // 验证webhook
    let evt: WebhookEvent;

    try {
      // 确保webhook密钥格式正确
      const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || "";
      // 去除可能的空白字符并确保它是有效的字符串
      const cleanedSecret = webhookSecret.trim();

      if (!cleanedSecret) {
        console.error("Webhook密钥未设置或为空");
        return new NextResponse("Webhook配置错误", { status: 500 });
      }

      const wh = new Webhook(cleanedSecret);
      evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new NextResponse("webhook验证错误", { status: 400 });
    }

    // 处理不同类型的事件
    const eventType = evt.type;

    // 处理会话创建事件 - 即用户登录事件
    if (eventType === "session.created") {
      const sessionData = evt.data;

      try {
        // 提取会话数据
        const sessionId = sessionData.id as string;
        const userId = sessionData.user_id as string;
        const createdAt = new Date(sessionData.created_at as number);
        const lastActiveAt = new Date(sessionData.last_active_at as number);
        const expireAt = new Date(sessionData.expire_at as number);
        const status = sessionData.status as string;

        // 检查用户是否存在
        const user = await db.user.findUnique({
          where: { clerkId: userId },
        });

        if (!user) {
          console.log(`用户 ${userId} 不存在，无法创建会话记录`);
          return NextResponse.json({ success: true });
        }

        // 添加或更新用户登录时间
        await db.user.update({
          where: { clerkId: userId },
          data: {
            updatedAt: new Date() // 更新最后活动时间
          },
        });

        console.log(`用户 ${userId} 登录成功，会话ID: ${sessionId}`);
      } catch (error) {
        console.error("处理用户登录事件错误:", error);
        // 返回成功响应以避免重试，因为这不是致命错误
        return NextResponse.json({ success: true });
      }
    }

    // 处理用户事件 - 在用户创建或更新时将数据同步到数据库
    if (eventType === "user.created" || eventType === "user.updated") {
      const userData = evt.data;
      const id = userData.id as string;
      const emailAddresses = userData.email_addresses as Array<{ email_address: string }>;
      const firstName = userData.first_name as string | null;
      const lastName = userData.last_name as string | null;

      // 获取用户的主要电子邮件
      const emailObject = emailAddresses && emailAddresses[0];
      const email = emailObject && emailObject.email_address ? emailObject.email_address : null;

      // 生成用户名
      const name = firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName
          ? firstName
          : (email ? email.split('@')[0] : id);

      try {
        // 使用 upsert 操作 - 如果用户存在则更新，不存在则创建
        await db.user.upsert({
          where: { clerkId: id },
          update: {
            email: email,
            name: name,
          },
          create: {
            clerkId: id,
            email: email,
            name: name,
          },
        });

        console.log(`用户 ${id} 已成功${eventType === "user.created" ? "创建" : "更新"}`);
      } catch (error) {
        console.error("数据库操作错误:", error);
        return new NextResponse("数据库操作失败", { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook处理错误:", error);
    return new NextResponse("Webhook处理失败", { status: 500 });
  }
}
