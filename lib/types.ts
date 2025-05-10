/**
 * 全局类型声明
 */

// 扩展Window接口，添加Clerk属性
interface Window {
  Clerk?: {
    user: unknown;
    [key: string]: any;
  };
}

// 扩展Clerk用户属性
export interface ClerkUser {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddresses?: { emailAddress: string }[];
  [key: string]: any;
}
