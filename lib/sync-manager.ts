/**
 * 数据同步管理器
 * 负责在本地存储和云端数据库之间同步数据
 */

import { localStorageService, LocalStorageItem, SyncConflict } from './local-storage';
import { generateVersionId } from './auto-save';

// 同步配置选项
export interface SyncOptions {
  // 是否自动同步
  autoSync?: boolean;
  // 自动同步间隔（毫秒）
  syncInterval?: number;
  // 同步失败后的重试次数
  retryCount?: number;
  // 同步失败后的重试延迟（毫秒）
  retryDelay?: number;
  // 冲突解决策略
  conflictStrategy?: 'useLocal' | 'useRemote' | 'manual';
  // 是否在同步前执行网络检查
  checkConnectivity?: boolean;
}

// 同步结果
export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: SyncConflict<any>[];
  timestamp: string;
  error?: any;
}

// 同步状态
export interface SyncState {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  hasConnectivity: boolean;
  pendingItems: number;
  conflictItems: number;
}

class SyncManager {
  private options: SyncOptions;
  private state: SyncState;
  private syncTimer: NodeJS.Timeout | null = null;
  private onSyncCompleteCallbacks: ((result: SyncResult) => void)[] = [];
  private onSyncErrorCallbacks: ((error: any) => void)[] = [];
  private onConflictCallbacks: ((conflicts: SyncConflict<any>[]) => void)[] = [];

  constructor(options: SyncOptions = {}) {
    this.options = {
      autoSync: true,
      syncInterval: 60000, // 默认1分钟
      retryCount: 3,
      retryDelay: 5000, // 5秒
      conflictStrategy: 'manual',
      checkConnectivity: true,
      ...options
    };

    this.state = {
      lastSyncTime: null,
      isSyncing: false,
      hasConnectivity: true,
      pendingItems: 0,
      conflictItems: 0
    };

    // 初始化
    this.init();
  }

  // 初始化同步管理器
  private init() {
    // 计算待同步项目
    this.updatePendingItemsCount();

    // 设置自动同步
    if (this.options.autoSync) {
      this.startAutoSync();
    }

    // 监听在线状态变化
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // 获取当前同步状态
  public getSyncState(): SyncState {
    return { ...this.state };
  }

  // 启动自动同步
  public startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncAll();
    }, this.options.syncInterval);
  }

  // 停止自动同步
  public stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // 同步所有待同步项目
  public async syncAll(): Promise<SyncResult> {
    // 如果已经在同步中，返回
    if (this.state.isSyncing) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        conflicts: [],
        timestamp: new Date().toISOString(),
        error: '同步已在进行中'
      };
    }

    // 检查连接状态
    if (this.options.checkConnectivity && !this.state.hasConnectivity) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        conflicts: [],
        timestamp: new Date().toISOString(),
        error: '无网络连接'
      };
    }

    // 设置同步状态
    this.state.isSyncing = true;

    try {
      // 获取所有待同步项目
      const pendingItems = localStorageService.getPendingItems();
      let syncedItems = 0;
      let failedItems = 0;
      const conflicts: SyncConflict<any>[] = [];

      // 没有待同步项目
      if (pendingItems.length === 0) {
        this.state.isSyncing = false;
        this.state.lastSyncTime = new Date();

        return {
          success: true,
          syncedItems: 0,
          failedItems: 0,
          conflicts: [],
          timestamp: new Date().toISOString()
        };
      }

      // 同步每个项目
      for (const item of pendingItems) {
        try {
          // 同步到服务器的逻辑
          // 这里应该调用实际的API，例如：
          // const response = await syncItemToServer(item);

          // 模拟同步操作
          const syncSuccess = await this.mockSyncToServer(item);

          if (syncSuccess) {
            // 更新同步状态
            localStorageService.updateSyncStatus(item.key, 'synced');
            syncedItems++;
          } else {
            failedItems++;
          }
        } catch (error) {
          failedItems++;
          console.error('同步项目失败:', error);
        }
      }

      // 检查冲突
      const conflictItems = localStorageService.getConflictItems();

      for (const item of conflictItems) {
        conflicts.push({
          localVersion: item,
          remoteVersion: null, // 应该从服务器获取
          resolved: false
        });
      }

      // 更新同步状态
      this.state.lastSyncTime = new Date();
      this.state.isSyncing = false;
      this.updatePendingItemsCount();

      // 触发同步完成回调
      const result: SyncResult = {
        success: failedItems === 0,
        syncedItems,
        failedItems,
        conflicts,
        timestamp: new Date().toISOString()
      };

      this.notifySyncComplete(result);

      return result;
    } catch (error) {
      // 处理同步错误
      this.state.isSyncing = false;
      this.notifySyncError(error);

      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        conflicts: [],
        timestamp: new Date().toISOString(),
        error
      };
    }
  }

  // 解决冲突
  public resolveConflict<T>(conflict: SyncConflict<T>, strategy: 'useLocal' | 'useRemote' | 'merge', mergedData?: T): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      try {
        const { localVersion } = conflict;

        // 根据策略解决冲突
        switch (strategy) {
          case 'useLocal':
            // 使用本地版本
            // const response = await syncItemToServer(localVersion);
            localStorageService.updateSyncStatus(localVersion.key, 'synced');
            conflict.resolved = true;
            break;

          case 'useRemote':
            // 使用远程版本
            // 从服务器获取最新版本
            // const remoteData = await fetchFromServer(localVersion.key);
            // localStorageService.updateItem(localVersion.key, remoteData, 'synced');
            conflict.resolved = true;
            break;

          case 'merge':
            // 合并版本
            if (mergedData) {
              // const response = await syncItemToServer({ ...localVersion, data: mergedData });
              localStorageService.updateItem(localVersion.key, mergedData, 'synced');
              conflict.resolved = true;
            } else {
              throw new Error('合并策略需要提供合并后的数据');
            }
            break;

          default:
            throw new Error('无效的冲突解决策略');
        }

        this.updatePendingItemsCount();
        resolve(true);
      } catch (error) {
        console.error('解决冲突失败:', error);
        resolve(false);
      }
    });
  }

  // 注册同步完成回调
  public onSyncComplete(callback: (result: SyncResult) => void) {
    this.onSyncCompleteCallbacks.push(callback);
  }

  // 注册同步错误回调
  public onSyncError(callback: (error: any) => void) {
    this.onSyncErrorCallbacks.push(callback);
  }

  // 注册冲突回调
  public onConflict(callback: (conflicts: SyncConflict<any>[]) => void) {
    this.onConflictCallbacks.push(callback);
  }

  // 触发同步完成回调
  private notifySyncComplete(result: SyncResult) {
    this.onSyncCompleteCallbacks.forEach(callback => callback(result));
  }

  // 触发同步错误回调
  private notifySyncError(error: any) {
    this.onSyncErrorCallbacks.forEach(callback => callback(error));
  }

  // 触发冲突回调
  private notifyConflict(conflicts: SyncConflict<any>[]) {
    this.onConflictCallbacks.forEach(callback => callback(conflicts));
  }

  // 处理联网事件
  private handleOnline = () => {
    this.state.hasConnectivity = true;

    // 尝试同步
    if (this.options.autoSync) {
      this.syncAll();
    }
  }

  // 处理断网事件
  private handleOffline = () => {
    this.state.hasConnectivity = false;
  }

  // 更新待同步项目计数
  private updatePendingItemsCount() {
    const pendingItems = localStorageService.getPendingItems();
    const conflictItems = localStorageService.getConflictItems();

    this.state.pendingItems = pendingItems.length;
    this.state.conflictItems = conflictItems.length;
  }

  // 模拟同步到服务器（仅用于演示）
  private mockSyncToServer(item: LocalStorageItem<any>): Promise<boolean> {
    return new Promise((resolve) => {
      // 模拟90%的成功率
      const success = Math.random() < 0.9;

      // 模拟网络延迟
      setTimeout(() => {
        resolve(success);
      }, 500);
    });
  }
}

// 导出单例
export const syncManager = new SyncManager();
