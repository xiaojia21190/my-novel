/**
 * 本地存储服务
 * 提供离线数据持久化和同步功能
 */

// 定义本地存储项目类型
export interface LocalStorageItem<T> {
  key: string;
  data: T;
  timestamp: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  version: string;
  meta?: Record<string, any>;
}

// 定义同步冲突类型
export interface SyncConflict<T> {
  localVersion: LocalStorageItem<T>;
  remoteVersion: any;
  resolved: boolean;
  resolutionStrategy?: 'useLocal' | 'useRemote' | 'merge';
}

class LocalStorageService {
  // 获取本地存储项目
  getItem<T>(key: string): LocalStorageItem<T> | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as LocalStorageItem<T>;
    } catch (error) {
      console.error('从本地存储获取失败:', error);
      return null;
    }
  }

  // 保存到本地存储
  setItem<T>(key: string, data: T, meta?: Record<string, any>): LocalStorageItem<T> {
    try {
      const timestamp = new Date().toISOString();
      const item: LocalStorageItem<T> = {
        key,
        data,
        timestamp,
        syncStatus: 'pending',
        version: `local-${Date.now()}`,
        meta
      };

      localStorage.setItem(key, JSON.stringify(item));
      return item;
    } catch (error) {
      console.error('本地存储保存失败:', error);
      throw new Error('本地存储保存失败');
    }
  }

  // 更新本地存储项目
  updateItem<T>(key: string, data: T, syncStatus?: 'synced' | 'pending' | 'conflict'): LocalStorageItem<T> | null {
    try {
      const item = this.getItem<T>(key);
      if (!item) return null;

      const updatedItem: LocalStorageItem<T> = {
        ...item,
        data,
        timestamp: new Date().toISOString(),
        syncStatus: syncStatus || item.syncStatus,
        version: `local-${Date.now()}`
      };

      localStorage.setItem(key, JSON.stringify(updatedItem));
      return updatedItem;
    } catch (error) {
      console.error('本地存储更新失败:', error);
      return null;
    }
  }

  // 删除本地存储项目
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('本地存储删除失败:', error);
      return false;
    }
  }

  // 获取所有未同步的项目
  getPendingItems<T>(): LocalStorageItem<T>[] {
    try {
      const pendingItems: LocalStorageItem<T>[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const item = this.getItem<T>(key);
        if (item && item.syncStatus === 'pending') {
          pendingItems.push(item);
        }
      }

      return pendingItems;
    } catch (error) {
      console.error('获取未同步项目失败:', error);
      return [];
    }
  }

  // 获取所有有冲突的项目
  getConflictItems<T>(): LocalStorageItem<T>[] {
    try {
      const conflictItems: LocalStorageItem<T>[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const item = this.getItem<T>(key);
        if (item && item.syncStatus === 'conflict') {
          conflictItems.push(item);
        }
      }

      return conflictItems;
    } catch (error) {
      console.error('获取冲突项目失败:', error);
      return [];
    }
  }

  // 更新同步状态
  updateSyncStatus(key: string, status: 'synced' | 'pending' | 'conflict'): boolean {
    try {
      const item = this.getItem(key);
      if (!item) return false;

      item.syncStatus = status;
      item.timestamp = new Date().toISOString();

      localStorage.setItem(key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('更新同步状态失败:', error);
      return false;
    }
  }

  // 清除所有本地存储
  clearAll(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('清除本地存储失败:', error);
      return false;
    }
  }

  // 存储基于ID的故事内容 - 集成到小说应用的特定函数
  saveStoryContent(storyId: string, content: string, title?: string): LocalStorageItem<{ content: string, title?: string }> {
    const key = `story_content_${storyId}`;
    return this.setItem(key, { content, title }, { type: 'story_content', storyId });
  }

  // 获取基于ID的故事内容
  getStoryContent(storyId: string): LocalStorageItem<{ content: string, title?: string }> | null {
    const key = `story_content_${storyId}`;
    return this.getItem(key);
  }

  // 存储草稿 - 未登录用户的临时内容
  saveDraft(draftId: string, content: any): LocalStorageItem<any> {
    const key = `draft_${draftId}`;
    return this.setItem(key, content, { type: 'draft' });
  }

  // 获取所有草稿
  getAllDrafts(): LocalStorageItem<any>[] {
    try {
      const drafts: LocalStorageItem<any>[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('draft_')) continue;

        const item = this.getItem(key);
        if (item) {
          drafts.push(item);
        }
      }

      return drafts;
    } catch (error) {
      console.error('获取所有草稿失败:', error);
      return [];
    }
  }

  // 检查浏览器存储可用性和容量
  checkStorageAvailability(): { available: boolean, remaining: number } {
    try {
      // 检查localStorage是否可用
      const testKey = '___test___';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      // 估算剩余容量（大约5MB是localStorage的典型限制）
      const totalSpace = 5 * 1024 * 1024; // 5MB in bytes
      let usedSpace = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const item = localStorage.getItem(key);
        if (item) {
          usedSpace += new Blob([item]).size;
        }
      }

      const remaining = totalSpace - usedSpace;

      return {
        available: true,
        remaining
      };
    } catch (error) {
      return {
        available: false,
        remaining: 0
      };
    }
  }
}

// 导出单例
export const localStorageService = new LocalStorageService();
