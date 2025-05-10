/**
 * 简单的 toast 通知工具
 */

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

// 临时 toast 函数，实际项目中可能使用更复杂的组件库
export const toast = (options: ToastOptions) => {
  console.log(`Toast: ${options.title} - ${options.description || ''} [${options.variant || 'default'}]`);

  // 在实际项目中，这里会调用 UI 库的 toast 组件
  // 例如 react-hot-toast 或 shadcn/ui toast 等

  // 显示原生浏览器通知（仅作为后备方案）
  if (typeof window !== 'undefined') {
    try {
      const message = options.description ? `${options.title}: ${options.description}` : options.title;

      // 如果浏览器支持通知 API 且已获得权限
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(message);
      } else {
        // 否则使用 alert 作为最后的后备
        if (options.variant === 'destructive') {
          alert(message);
        } else {
          // 非错误消息使用控制台输出，避免过多打扰用户
          console.info(message);
        }
      }
    } catch (e) {
      console.error('显示通知失败', e);
    }
  }
};

export default toast;
