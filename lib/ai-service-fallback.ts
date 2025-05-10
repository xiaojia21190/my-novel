/**
 * AI服务降级策略
 * 当AI服务不可用时提供备用响应和降级逻辑
 */

import { AIFallbackConfig } from '@/types/error';

// 默认AI服务降级配置
export const DEFAULT_AI_FALLBACK_CONFIG: AIFallbackConfig = {
  maxRetries: 3,
  retryDelay: 1500,
  timeoutMs: 30000,
  fallbackResponses: {
    'character-description': [
      '一个来自远方的角色，性格复杂而深刻。他/她拥有丰富的人生经历，这使得他/她在面对挑战时总能独具慧眼。受过良好教育，但真正的智慧来自于生活的历练。',
      '这个角色内向而敏感，善于观察周围的一切。虽然不善言辉，但在关键时刻总能说出一针见血的话语。他/她的过去充满谜团，这也是其行为举止的动因所在。',
      '活泼开朗的角色，总是能给周围的人带来欢乐。他/她乐观向上，即使在最黑暗的时刻也能看到希望。坚强而又不失温柔，是朋友们的依靠和精神支柱。'
    ],
    'outline': [
      '第一章：引入主要角色和背景设定，展现平静生活中的不安因素。\n第二章：主角发现一个改变其命运的秘密，决定踏上冒险之旅。\n第三章：遇到重要盟友，同时也吸引了反派的注意。\n第四章：首次重大冲突，主角经历失败。\n第五章：寻找新的力量和知识，角色成长。\n终章：决战和解决，主角实现蜕变。',
      '开篇：在一个平凡的小镇，主角面临生活的转折点。\n上升：意外发现引发一连串事件，主角被迫离开舒适区。\n发展：结识新朋友和敌人，世界观被颠覆。\n高潮：直面最大恐惧，付出巨大代价。\n转折：发现真相，重新审视初心。\n结局：回归但已非昔日之人，世界也因主角的行动而有所不同。'
    ],
    'chapter': [
      '阳光透过窗帘的缝隙洒在地板上，形成一道金色的线条。主角缓缓醒来，今天将是非同寻常的一天。昨晚的梦境依然清晰，那些奇怪的预示让他/她心神不宁。\n\n起床后，例行公事般地准备早餐，电视里播放着普通的新闻。然而，当报道提到那个地方时，主角的注意力立刻被吸引。正是昨晚梦中出现的场景。\n\n这不可能是巧合。放下手中的杯子，主角决定今天必须去那里一探究竟。或许，这将是命运的转折点。',
      '雨水拍打着窗户，城市笼罩在一片灰蒙蒙的氛围中。主角站在窗前，望着模糊的街景，思绪万千。最近发生的事情已经远远超出了生活的正常轨迹。\n\n桌上散落着几封信件和一张照片。那是唯一的线索，指向一个从未听说过的地址。按理说，明智的选择是报警或者至少告诉身边的人。但内心深处，主角知道这是只属于自己的旅程。\n\n收拾好简单的行装，留下一张纸条。踏出门的那一刻，暴雨忽然停了，仿佛是某种预示。'
    ],
    'writing-suggestion': [
      '考虑增加更多感官描述，让读者能够更身临其境地体验场景。\n可以深入挖掘角色的内心独白，展现其复杂的心理活动。\n故事节奏可以有所变化，在高潮部分加快节奏，在情感部分放慢节奏。',
      '当前情节可以增加一些悬念或伏笔，为后续发展埋下线索。\n主角的反应似乎过于理想化，可以考虑加入一些内心挣扎或矛盾。\n场景转换之间可以增加过渡段落，使故事流程更加自然。',
      '对话部分可以更加个性化，反映各角色的独特语言习惯和性格特点。\n可以适当增加冲突，无论是外部冲突还是内心冲突，都能推动故事发展。\n某些场景描述可以更加简洁，避免过多的修饰词影响阅读节奏。'
    ],
    'ai-assistance': [
      '抱歉，AI辅助功能暂时不可用。您可以尝试：\n1. 使用系统提供的预设模板\n2. 参考写作指南中的建议\n3. 稍后再次尝试此功能',
      '无法连接到AI服务。您可以继续手动创作，或稍后再试。我们的写作指南区提供了多种创作技巧和建议，可能对您有所帮助。',
      'AI服务遇到临时问题。请保存您的作品，并考虑稍后再使用辅助功能。此时您可以专注于角色塑造和情节设计的核心部分。'
    ],
    'feedback': [
      '故事整体结构完整，角色塑造有深度。情节发展自然，但部分转折点可能需要更多铺垫。语言风格一致，适合目标读者群。建议进一步丰富次要角色的背景，增强世界观构建的完整性。',
      '作品展现了独特的创作视角，主题明确。角色动机清晰，行为合理。叙事节奏适宜，但中段略显拖沓。对话自然生动，能体现角色个性。建议强化故事的核心冲突，并在结局部分提供更深层的主题升华。',
      '故事开端吸引人，成功建立了读者兴趣。情节发展有逻辑性，但某些关键决定点缺乏足够支撑。场景描写生动，能够带给读者沉浸感。建议复查角色成长轨迹，确保其变化是渐进且合理的。整体而言是一个有潜力的作品。'
    ],
    'analyze-consistency': [
      '分析发现故事在以下方面保持了较好的一致性：\n- 主要角色性格特征\n- 世界观设定规则\n- 故事时间线\n\n可能需要注意的不一致之处：\n- 次要角色出场时间和动机\n- 部分场景描述的季节细节\n- 角色能力的边界限制',
      '故事内在逻辑基本连贯。角色动机清晰，行为符合其设定。情节发展自然，没有明显跳跃。\n\n需要关注的方面：\n- 确保各章节之间的时间流转合理\n- 维持角色语言风格的一致性\n- 检查部分地理位置描述是否一致',
      '故事主线保持了良好的连贯性。主角的成长曲线符合情节发展。\n\n可能存在的不一致：\n- 部分支线情节未完全融入主线\n- 个别概念解释存在矛盾\n- 角色关系网络在后期章节有细微变化\n\n建议重点检查这些方面，确保读者体验的完整性。'
    ]
  }
};

/**
 * 尝试使用重试机制调用AI服务
 * @param apiFunction AI API函数
 * @param args API函数参数
 * @param config 降级配置
 */
export async function withRetry<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  args: any[],
  config: Partial<AIFallbackConfig> = {}
): Promise<T> {
  // 合并默认配置
  const fullConfig: AIFallbackConfig = {
    ...DEFAULT_AI_FALLBACK_CONFIG,
    ...config
  };

  let lastError: Error | null = null;

  // 尝试指定次数
  for (let attempt = 1; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fullConfig.timeoutMs);

      // 添加信号到最后一个参数如果它是对象
      if (args.length > 0 && typeof args[args.length - 1] === 'object') {
        args[args.length - 1] = {
          ...args[args.length - 1],
          signal: controller.signal
        };
      } else {
        args.push({ signal: controller.signal });
      }

      const result = await apiFunction(...args);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`AI服务调用失败(尝试 ${attempt}/${fullConfig.maxRetries}):`, error.message);

      // 如果不是最后一次尝试，等待后重试
      if (attempt < fullConfig.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, fullConfig.retryDelay));
        // 延迟时间增加，实现指数退避
        fullConfig.retryDelay = Math.min(fullConfig.retryDelay * 1.5, 10000);
      }
    }
  }

  // 所有重试都失败后抛出错误
  throw lastError || new Error('AI服务调用失败');
}

/**
 * 获取特定类型的备用响应
 * @param type 响应类型
 * @param config 降级配置
 */
export function getFallbackResponse(
  type: keyof typeof DEFAULT_AI_FALLBACK_CONFIG.fallbackResponses,
  config: Partial<AIFallbackConfig> = {}
): string {
  // 合并默认配置
  const fullConfig: AIFallbackConfig = {
    ...DEFAULT_AI_FALLBACK_CONFIG,
    ...config
  };

  const responses = fullConfig.fallbackResponses[type] || fullConfig.fallbackResponses['ai-assistance'];

  if (!responses || responses.length === 0) {
    return '无法生成内容，请稍后再试。';
  }

  // 随机选择一个备用响应
  const index = Math.floor(Math.random() * responses.length);
  return responses[index];
}

/**
 * 使用AI服务并提供降级能力
 * @param apiFunction AI API函数
 * @param fallbackType 备用响应类型
 * @param args API函数参数
 * @param config 降级配置
 */
export async function withAIFallback<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  fallbackType: keyof typeof DEFAULT_AI_FALLBACK_CONFIG.fallbackResponses,
  args: any[] = [],
  config: Partial<AIFallbackConfig> = {}
): Promise<T | string> {
  try {
    // 尝试使用重试机制调用AI服务
    return await withRetry(apiFunction, args, config);
  } catch (error) {
    console.error('AI服务降级:', error);

    // 返回备用响应
    return getFallbackResponse(fallbackType, config);
  }
}

/**
 * 检查AI响应是否有效
 * @param response AI响应内容
 */
export function isValidAIResponse(response: any): boolean {
  // 如果响应是字符串
  if (typeof response === 'string') {
    // 空响应或过短响应视为无效
    if (!response || response.length < 10) return false;

    // 检查是否包含错误标识
    const errorIndicators = [
      'sorry', 'apologize', 'unavailable', 'error', 'fail', 'could not',
      'unable', 'not available', 'try again', '抱歉', '对不起', '失败',
      '错误', '无法', '不可用', '请重试'
    ];

    const lowerResponse = response.toLowerCase();
    // 如果响应很短且包含错误标识，视为无效
    if (response.length < 100 &&
      errorIndicators.some(indicator => lowerResponse.includes(indicator.toLowerCase()))) {
      return false;
    }
  }
  // 如果响应是对象但没有预期的字段
  else if (typeof response === 'object' && response !== null) {
    if (Object.keys(response).length === 0) return false;

    // 检查是否有错误字段
    if (response.error || response.errorMessage) return false;
  }
  // 空值或未定义视为无效
  else if (response === null || response === undefined) {
    return false;
  }

  return true;
}

/**
 * 预处理AI响应，如果无效则提供备用响应
 * @param response AI响应
 * @param fallbackType 备用响应类型
 * @param config 降级配置
 */
export function processAIResponse(
  response: any,
  fallbackType: keyof typeof DEFAULT_AI_FALLBACK_CONFIG.fallbackResponses,
  config: Partial<AIFallbackConfig> = {}
): any {
  if (!isValidAIResponse(response)) {
    console.warn('收到无效的AI响应，使用备用响应');
    return getFallbackResponse(fallbackType, config);
  }

  return response;
}
