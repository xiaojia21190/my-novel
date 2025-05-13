import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 性能优化配置 */

  // 图像优化配置
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60, // 增加缓存时间（秒）
    domains: [], // 允许的图片源域名
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 允许所有https图片源
      },
    ],
  },

  // 响应压缩
  compress: true,

  // 生产环境构建优化
  swcMinify: true, // 使用SWC进行最小化处理

  // 静态资源优化
  optimizeFonts: true,

  // 增量构建优化
  experimental: {
    optimizePackageImports: [
      // 默认情况下，NextJS会优化以下包的导入
      'react', 'react-dom', 'lucide-react',
      '@radix-ui/react-icons', '@radix-ui/react-slot',
      // TipTap相关组件，有助于减小客户端包大小
      '@tiptap/react', '@tiptap/extension-image', '@tiptap/starter-kit',
      '@tiptap/extension-placeholder', '@tiptap/extension-character-count',
      'sonner',
    ],
    optimisticClientCache: true,
    scrollRestoration: true,
    serverActions: {
      bodySizeLimit: '2mb', // 增大服务器操作的限制
    },
    turbo: {
      // Turbo相关优化
      resolveAlias: {
        // 别名解析
        // 示例：
        // 'some-external-lib': 'replacement-lib',
      },
    },
  },

  // 缓存优化
  onDemandEntries: {
    // 页面构建缓存
    maxInactiveAge: 60 * 60 * 1000, // 1小时
    pagesBufferLength: 5,
  },

  // 禁用指标遥测
  analyticsId: '',

  // 开启严格模式以促进更好的练习
  reactStrictMode: true,

  // 配置输出目录
  distDir: '.next',

  // 处理WebP图片
  webpack(config) {
    // 添加WebP处理
    config.module.rules.push({
      test: /\.webp$/,
      use: [{
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'static/media/[name].[hash:8].[ext]',
        }
      }],
    });

    return config;
  },
};

export default nextConfig;
