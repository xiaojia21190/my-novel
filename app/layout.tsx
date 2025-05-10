import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { EnhancedAuthProvider } from "@/lib/auth-context";
import ErrorProvider from "@/lib/error-context";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "奇思妙想 - 智能小说创作平台",
  description: "一个基于AI的小说创作平台，让你的创意故事更加精彩",
  keywords: "小说创作, AI, 故事生成, 创意写作",
  authors: [{ name: "AI创作团队" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="zh-CN" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-b from-background via-background to-muted/10`}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
            <EnhancedAuthProvider>
              <ErrorProvider>
                <div className="flex justify-center w-full min-h-screen">
                  <div className="w-full min-h-screen bg-background/80 backdrop-blur-sm">{children}</div>
                </div>
                <Toaster position="top-right" closeButton richColors />
              </ErrorProvider>
            </EnhancedAuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
