/**
 * API服务层，处理与OpenAI API的交互
 */

export interface GenerateResponse {
  prompts?: string[];
  story?: string;
  error?: string;
}

export type TaskType = 'generate_prompts' | 'continue_story';

export interface GenerateRequestParams {
  story: string;
  prompt?: string;
  task: TaskType;
}

/**
 * 生成后续提示
 * @param story 当前故事内容
 */
export async function generatePrompts(story: string): Promise<string[]> {
  const response = await callGenerateAPI({
    story,
    task: 'generate_prompts',
  });

  if (response.error) {
    throw new Error(response.error);
  }

  return response.prompts || [];
}

/**
 * 前端清洗故事内容，移除可能遗漏的提示词
 * @param content 故事内容
 * @returns 清洗后的内容
 */
function cleanStoryContent(content: string): string {
  if (!content) return '';

  // 移除常见引导语模式
  let cleanedContent = content
    // 移除"好的，根据..."等开头
    .replace(/^(好的|嗯|是的|没问题)[,，].*?(根据|基于).*?(提示|内容).*?[:：]/i, '')
    // 移除"继续撰写故事..."等开头
    .replace(/^(继续撰写|下面是|这是)(故事|小说).*?[:：]?/i, '')
    // 修剪空白
    .trim();

  // 检测并修复常见的内容重复问题
  // 处理类似"变得超来越强，光芒也越来越强"这样的重复表述
  cleanedContent = cleanedContent
    // 修复"变得超来越X"这种语法错误为"变得越来越X"
    .replace(/变得超来越(\w+)/g, '变得越来越$1')
    // 处理相邻重复的短语
    .replace(/([，。！？；：、\s])([^，。！？；：、\s]{2,5})\1\2/g, '$1$2')
    // 处理"越来越X，X也越来越X"这样的重复
    .replace(/越来越(\w+)，[^，。！？]+越来越\1/g, '越来越$1');

  // 确保内容的完整性，特别是中文句子的开头
  // 检查是否有常见的中文单词被部分截断的情况
  const commonChineseWords = ['的', '地', '得', '和', '在', '了', '是', '我', '你', '他', '她', '它', '们', '阔'];

  for (const word of commonChineseWords) {
    // 如果内容以这些词开头，可能是不完整的句子，但我们保留，由页面组件处理连接
    if (cleanedContent.startsWith(word)) {
      console.log(`检测到可能的不完整句子，以"${word}"开头`);
      break;
    }
  }

  return cleanedContent;
}

/**
 * 根据提示继续故事
 * @param story 当前故事内容
 * @param prompt 选择的提示
 */
export async function continueStory(story: string, prompt: string): Promise<string> {
  const response = await callGenerateAPI({
    story,
    prompt,
    task: 'continue_story',
  });

  if (response.error) {
    throw new Error(response.error);
  }

  // 应用前端清洗作为后端清洗的备份
  const storyContent = response.story || story;
  return cleanStoryContent(storyContent);
}

/**
 * 调用生成API
 */
async function callGenerateAPI(params: GenerateRequestParams): Promise<GenerateResponse> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `请求失败：${response.status}` };
    }

    return data;
  } catch (err) {
    console.error('API请求错误:', err);
    return { error: '网络错误，请稍后重试' };
  }
}

/**
 * 本地存储相关函数
 */

const STORAGE_KEY = 'novel_stories';

export interface StoredStory {
  id: string;
  title: string;
  content: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 保存故事到本地存储
 */
export function saveStory(title: string, content: string): StoredStory {
  const stories = getStoredStories();
  const contentArray = content.split('\n\n');

  // 检查是否有相同标题的故事，如果有则更新
  const existingIndex = stories.findIndex(s => s.title === title);
  const now = new Date().toISOString();
  const id = existingIndex >= 0 ? stories[existingIndex].id : `story_${Date.now()}`;

  const story: StoredStory = {
    id,
    title,
    content: contentArray,
    createdAt: existingIndex >= 0 ? stories[existingIndex].createdAt : now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    stories[existingIndex] = story;
  } else {
    stories.push(story);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  return story;
}

/**
 * 获取所有保存的故事
 */
export function getStoredStories(): StoredStory[] {
  if (typeof window === 'undefined') return [];

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];

  try {
    const stories = JSON.parse(data);

    // 兼容旧数据格式
    return stories.map((story: any) => {
      if (typeof story.content === 'string') {
        return {
          ...story,
          content: story.content.split('\n\n')
        };
      }
      return story;
    });
  } catch (e) {
    console.error('解析保存的故事失败:', e);
    return [];
  }
}

/**
 * 根据ID获取故事
 */
export function getStoryById(id: string): StoredStory | null {
  const stories = getStoredStories();
  return stories.find(story => story.id === id) || null;
}

/**
 * 删除故事
 */
export function deleteStory(id: string): boolean {
  const stories = getStoredStories();
  const newStories = stories.filter(story => story.id !== id);

  if (newStories.length === stories.length) {
    return false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newStories));
  return true;
}
