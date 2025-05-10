/**
 * API服务层，处理与OpenAI API的交互
 */

import { handleApiException, parseResponseError, APIError } from '@/lib/api-error-handler';
import { withAIFallback, isValidAIResponse, processAIResponse } from '@/lib/ai-service-fallback';

export type TaskType =
  | 'generate_prompts'
  | 'continue_story'
  | 'generate_coherent_chapter'
  | 'analyze_coherence';

export interface GenerateResponse {
  prompts?: string[];
  story?: string;
  error?: string;
}

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
  try {
    const response = await callGenerateAPI({
      story,
      task: 'generate_prompts',
    });

    if (response.error) {
      throw new APIError(response.error);
    }

    return response.prompts || [];
  } catch (error) {
    console.error('生成提示失败:', error);

    // 使用AI降级策略
    return await withAIFallback(
      async () => {
        const response = await callGenerateAPI({
          story,
          task: 'generate_prompts',
        });

        if (response.error) {
          throw new APIError(response.error);
        }

        return response.prompts || [];
      },
      'writing-suggestion',
      []
    ) as string[];
  }
}

/**
 * 前端清洗故事内容，移除可能遗漏的提示词
 * @param content 故事内容
 * @returns 清洗后的内容
 */
function cleanStoryContent(content: string): string {
  if (!content) return '';

  // 移除可能的提示词泄露
  let cleaned = content
    // 移除"提示："或"提示:"开头的内容
    .replace(/^提示[:：].*\n/gm, '')
    // 移除"故事内容："或"故事内容:"开头的内容
    .replace(/^故事内容[:：].*\n/gm, '')
    // 移除可能的AI指令泄露
    .replace(/^(作为一个|我是一个).*写作助手.*\n/gm, '')
    // 移除"继续撰写故事"等引导文本
    .replace(/^(继续撰写故事|请继续|下面是故事的下一部分)[:：]?\n/gm, '');

  return cleaned.trim();
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
 * 故事存储相关函数
 */

const STORAGE_KEY = 'novel_stories';

export interface StoredStory {
  id: string;
  title: string;
  content: string[];
  createdAt: string;
  updatedAt: string;
  userId?: string; // 关联的用户ID (如果有)
}

import { getAuthState } from './auth-context';

/**
 * 检查用户是否已登录
 * 这是一个前端检查，更严格的检查发生在服务器端
 */
export function isUserLoggedIn(): boolean {
  // 使用auth-context中的getAuthState获取认证状态
  const { isAuthenticated, isLoaded } = getAuthState();

  // 只有当状态已加载且用户已认证时，才返回true
  return isLoaded && isAuthenticated;
}

/**
 * 保存故事到存储（本地或服务器）
 * @param title 故事标题
 * @param content 故事内容
 * @returns 保存的故事对象
 */
export async function saveStory(title: string, content: string): Promise<StoredStory> {
  const contentArray = content.split('\n\n');
  const isLoggedIn = isUserLoggedIn();

  if (isLoggedIn) {
    // 用户已登录，保存到服务器
    try {
      const savedStory = await saveStoryToServer(title, contentArray);

      // 为了确保本地和服务器数据一致，也保存到本地
      saveStoryToLocal(savedStory);

      return savedStory;
    } catch (error) {
      console.error('保存故事到服务器失败:', error);
      // 如果服务器保存失败，回退到本地存储
      return saveStoryToLocalStorage(title, contentArray);
    }
  } else {
    // 用户未登录，只保存到本地存储
    return saveStoryToLocalStorage(title, contentArray);
  }
}

/**
 * 保存故事到本地存储
 * @private
 */
function saveStoryToLocalStorage(title: string, contentArray: string[]): StoredStory {
  const stories = getStoredStories();

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
 * 将故事对象保存到本地存储
 * @private
 */
function saveStoryToLocal(story: StoredStory): void {
  const stories = getStoredStories();

  // 检查是否已存在该故事
  const existingIndex = stories.findIndex(s => s.id === story.id);

  if (existingIndex >= 0) {
    stories[existingIndex] = story;
  } else {
    stories.push(story);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

/**
 * 保存故事到服务器
 * @private
 */
async function saveStoryToServer(title: string, content: string[]): Promise<StoredStory> {
  try {
    const response = await fetch('/api/user/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `保存失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('保存到服务器失败:', error);
    throw error;
  }
}

/**
 * 获取所有故事（从本地和服务器）
 */
export async function getAllStories(): Promise<StoredStory[]> {
  const localStories = getStoredStories();

  // 检查用户是否已登录
  if (isUserLoggedIn()) {
    try {
      // 尝试从服务器获取故事
      const serverStories = await getStoriesFromServer();

      // 合并本地和服务器故事，去重
      const allStories = mergeStories(localStories, serverStories);

      // 更新本地缓存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allStories));

      return allStories;
    } catch (error) {
      console.error('从服务器获取故事失败:', error);
      // 如果服务器获取失败，返回本地故事
      return localStories;
    }
  }

  // 用户未登录，只返回本地故事
  return localStories;
}

/**
 * 合并本地和服务器故事，处理冲突
 * @private
 */
function mergeStories(localStories: StoredStory[], serverStories: StoredStory[]): StoredStory[] {
  const mergedMap = new Map<string, StoredStory>();

  // 先添加所有本地故事
  localStories.forEach(story => {
    mergedMap.set(story.id, story);
  });

  // 然后添加服务器故事，如果ID冲突，以更新时间晚的为准
  serverStories.forEach(serverStory => {
    const localStory = mergedMap.get(serverStory.id);

    if (!localStory || new Date(serverStory.updatedAt) > new Date(localStory.updatedAt)) {
      mergedMap.set(serverStory.id, serverStory);
    }
  });

  // 转换回数组并按更新时间排序
  return Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * 从服务器获取故事
 * @private
 */
async function getStoriesFromServer(): Promise<StoredStory[]> {
  try {
    const response = await fetch('/api/user/story', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `获取失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('从服务器获取故事失败:', error);
    throw error;
  }
}

/**
 * 获取所有保存的本地故事
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
export async function getStoryById(id: string): Promise<StoredStory | null> {
  // 先检查本地缓存
  const localStories = getStoredStories();
  const localStory = localStories.find(story => story.id === id);

  // 如果用户已登录且本地找不到，尝试从服务器获取
  if (!localStory && isUserLoggedIn()) {
    try {
      const response = await fetch(`/api/user/story/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const serverStory = await response.json();
        // 缓存到本地
        saveStoryToLocal(serverStory);
        return serverStory;
      }
    } catch (error) {
      console.error(`获取故事${id}失败:`, error);
    }
  }

  return localStory || null;
}

/**
 * 删除故事
 */
export async function deleteStory(id: string): Promise<boolean> {
  // 从本地删除
  const stories = getStoredStories();
  const newStories = stories.filter(story => story.id !== id);

  if (newStories.length === stories.length) {
    return false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newStories));

  // 如果用户已登录，也从服务器删除
  if (isUserLoggedIn()) {
    try {
      const response = await fetch(`/api/user/story/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.warn(`从服务器删除故事${id}失败，但已从本地删除`);
      }
    } catch (error) {
      console.error(`从服务器删除故事${id}失败:`, error);
    }
  }

  return true;
}

// 章节类型定义
export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  summary?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  storyId: string;
}

// 角色类型定义
export interface Character {
  id: string;
  name: string;
  description?: string;
  attributes?: string;
  storyId: string;
  userId: string;
}

/**
 * 获取故事的所有章节
 * @param storyId 故事ID
 */
export async function getChapters(storyId: string): Promise<Chapter[]> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/chapter`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `获取章节失败：${response.status}`);
    }

    return data.data || [];
  } catch (err) {
    console.error('获取章节失败:', err);
    throw err;
  }
}

/**
 * 获取单个章节
 * @param storyId 故事ID
 * @param chapterId 章节ID
 */
export async function getChapter(storyId: string, chapterId: string): Promise<Chapter> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/chapter/${chapterId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `获取章节失败：${response.status}`);
    }

    return data.data || null;
  } catch (err) {
    console.error('获取章节失败:', err);
    throw err;
  }
}

/**
 * 创建新章节
 * @param storyId 故事ID
 * @param chapterData 章节数据
 */
export async function createChapter(
  storyId: string,
  chapterData: { title: string; content: string; summary?: string; notes?: string }
): Promise<Chapter> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/chapter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapterData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `创建章节失败：${response.status}`);
    }

    return data.data;
  } catch (err) {
    console.error('创建章节失败:', err);
    throw err;
  }
}

/**
 * 更新章节
 * @param storyId 故事ID
 * @param chapterId 章节ID
 * @param chapterData 章节数据
 */
export async function updateChapter(
  storyId: string,
  chapterId: string,
  chapterData: {
    title?: string;
    content?: string;
    summary?: string;
    notes?: string;
    order?: number;
  }
): Promise<Chapter> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/chapter/${chapterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapterData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `更新章节失败：${response.status}`);
    }

    return data.data;
  } catch (err) {
    console.error('更新章节失败:', err);
    throw err;
  }
}

/**
 * 删除章节
 * @param storyId 故事ID
 * @param chapterId 章节ID
 */
export async function deleteChapter(storyId: string, chapterId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/chapter/${chapterId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `删除章节失败：${response.status}`);
    }

    return true;
  } catch (err) {
    console.error('删除章节失败:', err);
    throw err;
  }
}

/**
 * 连贯性分析响应
 */
export interface CoherenceAnalysis {
  coherent: boolean;
  issues: string[];
}

/**
 * 分析章节间连贯性
 * @param previousChapter 上一章节内容
 * @param currentChapter 当前章节内容
 */
export async function analyzeCoherence(
  previousChapter: string,
  currentChapter: string
): Promise<CoherenceAnalysis> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        story: previousChapter,
        prompt: currentChapter,
        task: 'analyze_coherence',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `分析连贯性失败：${response.status}`);
    }

    return data.analysis || { coherent: true, issues: [] };
  } catch (err) {
    console.error('分析连贯性失败:', err);
    return { coherent: true, issues: [] };
  }
}

/**
 * 生成连贯的章节内容
 * @param storyId 故事ID
 * @param previousChapterId 前一章节ID
 * @param prompt 提示
 */
export async function generateCoherentChapter(
  storyId: string,
  previousChapterId: string,
  prompt: string
): Promise<string> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId,
        previousChapterId,
        prompt,
        task: 'generate_coherent_chapter',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `生成连贯章节失败：${response.status}`);
    }

    return data.content || '';
  } catch (err) {
    console.error('生成连贯章节失败:', err);
    throw err;
  }
}

/**
 * 获取故事大纲
 * @param storyId 故事ID
 * @param prompt 可选的提示内容
 */
export async function getOutline(storyId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/outline`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `获取大纲失败：${response.status}`);
    }

    return data.data.outline;
  } catch (err) {
    console.error('获取大纲失败:', err);
    throw err;
  }
}

/**
 * 更新故事大纲
 * @param storyId 故事ID
 * @param outline 大纲内容
 */
export async function updateOutline(storyId: string, outline: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/outline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `更新大纲失败：${response.status}`);
    }

    return true;
  } catch (err) {
    console.error('更新大纲失败:', err);
    throw err;
  }
}

/**
 * 生成故事大纲
 * @param storyId 故事ID
 * @param prompt 可选的提示内容
 */
export async function generateOutline(storyId: string, prompt?: string): Promise<string> {
  try {
    const response = await fetch(`/api/story/${storyId}/outline/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `生成大纲失败：${response.status}`);
    }

    return data.outline || '';
  } catch (err) {
    console.error('生成大纲失败:', err);
    throw err;
  }
}

// 生成角色描述
export async function generateCharacterDescription(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/generate/character-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `生成失败: ${response.status}`);
    }

    const data = await response.json();
    return data.description;
  } catch (error) {
    console.error('生成角色描述失败:', error);
    throw error;
  }
}

// 获取故事的所有角色
export async function getStoryCharacters(storyId: string): Promise<Character[]> {
  try {
    const response = await fetch(`/api/story/${storyId}/character`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `获取失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('获取角色失败:', error);
    throw error;
  }
}

// 创建角色
export async function createCharacter(
  storyId: string,
  characterData: { name: string; description?: string; attributes?: string }
): Promise<Character> {
  try {
    const response = await fetch(`/api/story/${storyId}/character`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `创建失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('创建角色失败:', error);
    throw error;
  }
}

// 更新角色
export async function updateCharacter(
  characterId: string,
  characterData: { name: string; description?: string; attributes?: string }
): Promise<Character> {
  try {
    const response = await fetch(`/api/story/character/${characterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `更新失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('更新角色失败:', error);
    throw error;
  }
}

// 删除角色
export async function deleteCharacter(characterId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/story/character/${characterId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `删除失败: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('删除角色失败:', error);
    throw error;
  }
}

// 使用AI生成角色
export async function generateCharacter(storyId: string, prompt: string): Promise<Character> {
  try {
    const response = await fetch(`/api/story/${storyId}/character/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `生成失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('生成角色失败:', error);
    throw error;
  }
}

// 获取故事数据
export async function getStory(storyId: string): Promise<any> {
  try {
    // 优先尝试通过API获取
    try {
      const response = await fetch(`/api/story/${storyId}`);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('通过API获取故事失败，尝试本地获取:', error);
    }

    // 如果API获取失败，尝试从本地获取
    const story = await getStoryById(storyId);
    if (!story) {
      throw new Error(`未找到故事: ${storyId}`);
    }

    return {
      id: story.id,
      title: story.title,
      content: story.content.join('\n\n'),
      createdAt: story.createdAt,
      updatedAt: story.updatedAt
    };
  } catch (error) {
    console.error('获取故事失败:', error);
    throw error;
  }
}

// 获取故事大纲（重命名为updateStoryOutline以避免与已有函数冲突）
export async function updateStoryOutline(storyId: string, outline: string): Promise<boolean> {
  return updateOutline(storyId, outline);
}

/**
 * 分析角色在章节中的表现
 * @param storyId 故事ID
 * @param characterIds 角色ID数组
 * @param chapterIds 章节ID数组
 */
export async function analyzeCharacters(
  storyId: string,
  characterIds: string[],
  chapterIds: string[]
): Promise<any> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/character/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterIds, chapterIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `分析角色失败：${response.status}`);
    }

    return data.data.analysis;
  } catch (err) {
    console.error('分析角色失败:', err);
    throw err;
  }
}

/**
 * 根据大纲生成章节
 * @param storyId 故事ID
 * @param outlineSection 大纲部分
 * @param chapterTitle 章节标题
 * @param previousChapterId 前一章节ID（可选）
 * @param autoSave 是否自动保存（可选）
 */
export async function generateChapterFromOutline(
  storyId: string,
  outlineSection: string,
  chapterTitle: string,
  previousChapterId?: string,
  autoSave: boolean = false
): Promise<any> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/chapter/generate-from-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlineSection,
        chapterTitle,
        previousChapterId,
        autoSave
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `生成章节失败：${response.status}`);
    }

    return data.data;
  } catch (err) {
    console.error('生成章节失败:', err);
    throw err;
  }
}

/**
 * 根据角色生成大纲
 * @param storyId 故事ID
 * @param theme 主题（可选）
 * @param genre 类型（可选）
 * @param additionalNotes 额外说明（可选）
 * @param autoSave 是否自动保存（可选）
 */
export async function generateOutlineFromCharacters(
  storyId: string,
  theme?: string,
  genre?: string,
  additionalNotes?: string,
  autoSave: boolean = false
): Promise<string> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/outline/generate-from-characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme,
        genre,
        additionalNotes,
        autoSave
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `生成大纲失败：${response.status}`);
    }

    return data.data.outline || '';
  } catch (err) {
    console.error('生成大纲失败:', err);
    throw err;
  }
}

/**
 * 分析故事内容一致性
 * @param storyId 故事ID
 * @param content 要分析的内容
 * @param checkType 检查类型（'character'|'plot'|'setting'|'all'）
 * @param chapterId 章节ID（可选，用于上下文）
 */
export async function analyzeConsistency(
  storyId: string,
  content: string,
  checkType: 'character' | 'plot' | 'setting' | 'all' = 'all',
  chapterId?: string
): Promise<any> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/analyze-consistency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        checkType,
        chapterId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `一致性分析失败：${response.status}`);
    }

    return data.data.analysis;
  } catch (err) {
    console.error('一致性分析失败:', err);
    throw err;
  }
}

/**
 * 获取AI创作辅助
 * @param storyId 故事ID
 * @param params 辅助参数
 */
export async function getAiAssistance(
  storyId: string,
  params: {
    content: string;
    assistanceType: string;
    specificRequest?: string;
    selectedText?: string;
    characterIds?: string[];
  }
): Promise<string> {
  try {
    // 使用非流式响应处理
    const response = await fetch(`/api/user/story/${storyId}/ai-assistance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `获取AI辅助失败：${response.status}`);
    }

    const data = await response.json();
    return data.data.result || '';
  } catch (err) {
    console.error('获取AI辅助失败:', err);
    throw err;
  }
}

/**
 * 解析大纲为章节列表
 * @param outline 大纲文本
 */
export function parseOutlineToSections(outline: string): { title: string; content: string }[] {
  if (!outline) return [];

  // 简单的基于标题的分割
  const sections: { title: string; content: string }[] = [];

  // 匹配标题模式，如"# 标题"、"## 标题"、"1. 标题"等
  const titleRegex = /(?:^|\n)(?:#{1,3}|\d+\.|[\u4e00-\u9fa5]{1,4}、|\*\*)[^\n]+/g;
  const titles = [...outline.matchAll(titleRegex)];

  if (titles.length === 0) {
    // 如果没有找到标题格式，尝试按空行分段
    const paragraphs = outline.split(/\n\s*\n/);
    return paragraphs.map((p, i) => ({
      title: `部分 ${i + 1}`,
      content: p.trim()
    })).filter(s => s.content);
  }

  // 根据找到的标题分割内容
  titles.forEach((titleMatch, index) => {
    const titleStart = titleMatch.index!;
    const titleEnd = titleStart + titleMatch[0].length;
    const title = titleMatch[0].trim().replace(/^(?:#{1,3}|\d+\.|[\u4e00-\u9fa5]{1,4}、|\*\*)\s*/, '').replace(/\*\*$/, '');

    const contentStart = titleEnd;
    const contentEnd = index < titles.length - 1 ? titles[index + 1].index! : outline.length;

    const content = outline.substring(contentStart, contentEnd).trim();

    if (title && content) {
      sections.push({ title, content });
    }
  });

  return sections;
}

// 添加创作阶段类型
export type StoryStage = 'planning' | 'characters' | 'outline' | 'writing' | 'editing' | 'complete';

// 添加故事元数据接口
export interface StoryMetadata {
  id: string;
  title: string;
  stage: StoryStage;
  characterCount: number;
  outlineCompleted: boolean;
  chapterCount: number;
  wordCount: number;
  lastEditedAt: string;
}

/**
 * 获取故事元数据
 * @param storyId 故事ID
 */
export async function getStoryMetadata(storyId: string): Promise<StoryMetadata> {
  try {
    // 并行获取所有需要的数据
    const [story, characters, chapters, outline] = await Promise.all([
      getStory(storyId),
      getStoryCharacters(storyId),
      getChapters(storyId),
      getOutline(storyId)
    ]);

    // 确定故事的当前阶段
    let stage: StoryStage = 'planning';

    if (characters.length === 0) {
      stage = 'planning';
    } else if (!outline) {
      stage = 'characters';
    } else if (chapters.length === 0) {
      stage = 'outline';
    } else {
      // 解析大纲章节
      let outlineSections: any[] = [];

      try {
        // 尝试解析为结构化数据
        const parsedOutline = JSON.parse(outline);

        if (Array.isArray(parsedOutline)) {
          outlineSections = parsedOutline;
        } else {
          // 可能是自由格式文本
          outlineSections = parseOutlineToSections(outline);
        }
      } catch (error) {
        // 解析失败，可能是自由格式文本
        outlineSections = parseOutlineToSections(outline);
      }

      if (outlineSections.length > chapters.length) {
        stage = 'writing';
      } else {
        stage = 'editing';
      }
    }

    // 计算总字数
    const wordCount = chapters.reduce((sum, chapter) => sum + (chapter.content?.length || 0), 0);

    return {
      id: storyId,
      title: story.title,
      stage,
      characterCount: characters.length,
      outlineCompleted: !!outline,
      chapterCount: chapters.length,
      wordCount,
      lastEditedAt: story.updatedAt
    };
  } catch (error) {
    console.error('获取故事元数据失败:', error);
    throw error;
  }
}

/**
 * 更新故事阶段
 * @param storyId 故事ID
 * @param stage 新的阶段
 */
export async function updateStoryStage(storyId: string, stage: StoryStage): Promise<boolean> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/update-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `更新故事阶段失败：${response.status}`);
    }

    return true;
  } catch (err) {
    console.error('更新故事阶段失败:', err);
    throw err;
  }
}

/**
 * 获取创作建议
 * @param storyId 故事ID
 * @param stage 当前阶段
 */
export async function getCreationSuggestions(storyId: string, stage: StoryStage): Promise<string[]> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/creation-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `获取创作建议失败：${response.status}`);
    }

    return data.data.suggestions || [];
  } catch (err) {
    console.error('获取创作建议失败:', err);
    return ['继续按照当前流程完善您的故事'];
  }
}

/**
 * 获取故事统计信息
 * @param storyId 故事ID
 */
export async function getStoryStats(storyId: string): Promise<{
  characterCount: number;
  chapterCount: number;
  wordCount: number;
  createdAt: string;
  lastEditedAt: string;
  estimatedReadingTime: number;
}> {
  try {
    const [story, characters, chapters] = await Promise.all([
      getStory(storyId),
      getStoryCharacters(storyId),
      getChapters(storyId)
    ]);

    // 计算统计信息
    const wordCount = chapters.reduce((sum, chapter) => sum + (chapter.content?.length || 0), 0);

    // 估计阅读时间（假设每分钟阅读500字）
    const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 500));

    return {
      characterCount: characters.length,
      chapterCount: chapters.length,
      wordCount,
      createdAt: story.createdAt,
      lastEditedAt: story.updatedAt,
      estimatedReadingTime
    };
  } catch (error) {
    console.error('获取故事统计信息失败:', error);
    throw error;
  }
}

/**
 * 生成故事预览/摘要
 * @param storyId 故事ID
 */
export async function generateStorySummary(storyId: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    const response = await fetch(`/api/user/story/${storyId}/generate-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `生成故事摘要失败：${response.status}`);
    }

    return {
      summary: data.data.summary || '',
      keyPoints: data.data.keyPoints || []
    };
  } catch (err) {
    console.error('生成故事摘要失败:', err);
    throw err;
  }
}

/**
 * 确定下一步行动
 * @param storyId 故事ID
 */
export async function suggestNextAction(storyId: string): Promise<{
  action: string;
  explanation: string;
  url: string;
}> {
  try {
    // 获取当前故事状态
    const metadata = await getStoryMetadata(storyId);

    // 基于状态推荐下一步行动
    let action = '';
    let explanation = '';
    let url = '';

    switch (metadata.stage) {
      case 'planning':
        action = '开始创建角色';
        explanation = '为故事创建主要角色，明确他们的特征、动机和背景故事';
        url = `/story/${storyId}/character/new`;
        break;

      case 'characters':
        action = '编写故事大纲';
        explanation = '基于已创建的角色，规划故事的主要情节和发展';
        url = `/story/${storyId}/outline`;
        break;

      case 'outline':
        action = '开始写作第一章';
        explanation = '根据大纲开始创作故事的第一个章节';
        url = `/story/${storyId}/chapter/new`;
        break;

      case 'writing':
        action = '继续写作下一章';
        explanation = '继续完成剩余的章节，按照大纲发展故事情节';
        url = `/story/${storyId}/chapter`;
        break;

      case 'editing':
        action = '检查内容一致性';
        explanation = '检查故事中的角色、情节和设定是否一致连贯';
        url = `/story/${storyId}/analyze-consistency`;
        break;

      case 'complete':
        action = '导出作品';
        explanation = '您的故事已完成，可以将其导出为PDF或其他格式';
        url = `/story/${storyId}/export`;
        break;
    }

    return { action, explanation, url };
  } catch (error) {
    console.error('推荐下一步行动失败:', error);
    return {
      action: '继续创作',
      explanation: '继续完善您的故事内容',
      url: `/story/${storyId}`
    };
  }
}
