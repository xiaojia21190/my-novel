/**
 * AI 响应缓存服务
 * 用于缓存常见的AI请求响应，减少重复请求，提高性能
 */

import { Message, AIRequestOptions } from "./ai-utils";

export type CacheEntry = {
  data: any;
  timestamp: number;
  expiresAt: number;
  fingerprint?: string; // 内容指纹，用于相似性匹配
  usageCount: number;  // 使用次数统计
};

type CacheConfig = {
  ttl: number; // 缓存生存时间(毫秒)
  maxEntries: number; // 最大缓存条目数
  enabled: boolean; // 是否启用缓存
  similarityThreshold: number; // 相似度阈值，0-1之间
  prefetchEnabled: boolean; // 是否启用预加载
};

class AIResponseCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    size: number;
    similarityHits: number; // 相似匹配命中
    evictions: number; // 缓存淘汰次数
  };

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map();
    this.config = {
      ttl: 15 * 60 * 1000, // 默认15分钟
      maxEntries: 100,     // 默认最多100条
      enabled: true,       // 默认启用
      similarityThreshold: 0.85, // 默认相似度阈值
      prefetchEnabled: false, // 默认不启用预加载
      ...config
    };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      similarityHits: 0,
      evictions: 0
    };

    // 初始化时执行缓存清理
    this.scheduleCleanup();
  }

  /**
   * 生成缓存键 - 增强版哈希算法
   * @param messages 消息数组
   * @param options 请求选项
   * @returns 缓存键
   */
  private generateCacheKey(messages: Message[], options?: AIRequestOptions): string {
    // 提取消息内容关键部分
    const normalizedMessages = messages.map(m => ({
      role: m.role,
      // 对系统消息保持完整，对用户消息进行规范化处理
      content: m.role === 'system' ? m.content : this.normalizeContent(m.content)
    }));

    // 提取关键选项参数
    const relevantOptions = {
      temperature: options?.temperature || 0,
      maxTokens: options?.maxTokens,
      responseFormat: options?.responseFormat
    };

    // 将消息和选项序列化为字符串
    const dataToHash = JSON.stringify({
      messages: normalizedMessages,
      options: relevantOptions
    });

    // 使用更强的哈希算法
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    // 添加时间戳前缀（小时级别），实现自动过期
    const hourPrefix = Math.floor(Date.now() / (3600 * 1000));

    return `${hourPrefix}:${hash.toString(16)}`;
  }

  /**
   * 生成内容指纹，用于相似性匹配
   * @param content 内容字符串
   * @returns 内容指纹
   */
  private generateContentFingerprint(content: string): string {
    // 提取关键词和短语
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')  // 移除标点
      .split(/\s+/)              // 按空格分割
      .filter(w => w.length > 3) // 只保留较长的单词
      .slice(0, 20);             // 取前20个词

    return words.join(' ');
  }

  /**
   * 规范化内容用于缓存键生成
   * @param content 原始内容
   * @returns 规范化的内容
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')     // 规范化空白
      .replace(/[^\w\s]/g, '')  // 移除标点
      .trim();
  }

  /**
   * 计算两个内容指纹的相似度 (0-1)
   * @param fp1 指纹1
   * @param fp2 指纹2
   * @returns 相似度 (0-1)
   */
  private calculateSimilarity(fp1: string, fp2: string): number {
    if (!fp1 || !fp2) return 0;

    const set1 = new Set(fp1.split(' '));
    const set2 = new Set(fp2.split(' '));

    // 计算交集大小
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    // Jaccard相似系数: |A ∩ B| / |A ∪ B|
    return intersection.size / (set1.size + set2.size - intersection.size);
  }

  /**
   * 获取缓存的响应，支持相似度匹配
   * @param messages 消息数组
   * @param options 请求选项
   * @returns 缓存的响应或null
   */
  public get(messages: Message[], options?: AIRequestOptions): any | null {
    if (!this.config.enabled) return null;

    const key = this.generateCacheKey(messages, options);
    let entry = this.cache.get(key);

    // 精确匹配
    if (entry) {
      // 检查缓存是否过期
      const now = Date.now();
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        this.stats.size = this.cache.size;
        this.stats.misses++;
        return null;
      }

      // 更新使用次数
      entry.usageCount++;
      this.stats.hits++;
      return entry.data;
    }

    // 没有精确匹配，尝试相似度匹配
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      const userContent = messages[messages.length - 1].content;
      const fingerprint = this.generateContentFingerprint(userContent);

      // 遍历缓存寻找相似的条目
      for (const [, cacheEntry] of this.cache.entries()) {
        if (!cacheEntry.fingerprint) continue;

        const similarity = this.calculateSimilarity(fingerprint, cacheEntry.fingerprint);
        if (similarity >= this.config.similarityThreshold) {
          // 找到足够相似的条目
          this.stats.similarityHits++;
          cacheEntry.usageCount++;
          return cacheEntry.data;
        }
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存
   * @param messages 消息数组
   * @param options 请求选项
   * @param data 要缓存的数据
   * @param customTtl 自定义TTL(可选)
   */
  public set(messages: Message[], options: AIRequestOptions | undefined, data: any, customTtl?: number): void {
    if (!this.config.enabled) return;

    const key = this.generateCacheKey(messages, options);
    const now = Date.now();
    const ttl = customTtl || this.config.ttl;

    // 为最后一条用户消息生成指纹
    let fingerprint: string | undefined;
    if (messages.length > 0) {
      const lastUserMessage = messages.findLast(m => m.role === 'user');
      if (lastUserMessage) {
        fingerprint = this.generateContentFingerprint(lastUserMessage.content);
      }
    }

    // 设置缓存
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      fingerprint,
      usageCount: 1
    });

    // 如果缓存超过最大条目数，执行淘汰策略
    if (this.cache.size > this.config.maxEntries) {
      this.evictCache();
    }

    this.stats.size = this.cache.size;
  }

  /**
   * 缓存淘汰策略 - 结合LRU和LFU
   */
  private evictCache(): void {
    if (this.cache.size <= this.config.maxEntries) return;

    // 计算需要淘汰的数量
    const evictCount = Math.max(1, Math.floor(this.cache.size * 0.1)); // 淘汰10%

    // 按访问时间和使用频率排序
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
      // 计算分数: 使用频率越高、越新的条目分数越高
      score: entry.usageCount * 0.7 + (Date.now() - entry.timestamp) * 0.3
    }));

    // 按分数升序排序
    entries.sort((a, b) => a.score - b.score);

    // 淘汰分数最低的条目
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      this.cache.delete(entries[i].key);
      this.stats.evictions++;
    }
  }

  /**
   * 清除缓存
   */
  public clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * 获取缓存统计信息
   */
  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 更新缓存配置
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  /**
   * 判断请求是否适合缓存
   * @param messages 消息数组
   * @param options 请求选项
   */
  public isCacheable(messages: Message[], options?: AIRequestOptions): boolean {
    if (!this.config.enabled) return false;

    // 流式响应不缓存
    if (options?.stream === true) return false;

    // 高温度（高随机性）的请求不适合缓存
    if (options?.temperature && options.temperature > 0.5) return false;

    // 检查消息长度，太长的消息可能导致不同的响应
    const contentLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    if (contentLength > 15000) return false;

    // 检查是否包含特定的不可缓存标记
    const lastUserMessage = messages.findLast(m => m.role === 'user');
    if (lastUserMessage?.content.includes('NO_CACHE')) return false;

    return true;
  }

  /**
   * 预热缓存 - 可用于预先缓存常见请求
   * @param entries 要预热的缓存条目列表
   */
  public prefetch(entries: { messages: Message[], options?: AIRequestOptions, data: any }[]): void {
    if (!this.config.enabled || !this.config.prefetchEnabled) return;

    for (const entry of entries) {
      if (this.isCacheable(entry.messages, entry.options)) {
        this.set(entry.messages, entry.options, entry.data);
      }
    }
  }

  /**
   * 定期清理过期缓存
   */
  private scheduleCleanup(): void {
    // 每小时执行一次清理
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      // 遍历缓存，移除过期条目
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        this.stats.size = this.cache.size;
        console.log(`自动清理过期缓存: 删除了 ${expiredCount} 个条目`);
      }
    }, 3600 * 1000); // 每小时
  }
}

// 导出单例实例
export const aiResponseCache = new AIResponseCache();
