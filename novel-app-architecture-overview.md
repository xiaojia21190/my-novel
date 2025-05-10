# AI辅助小说创作应用架构概述

## 目录
- [项目概述](#项目概述)
- [技术架构](#技术架构)
- [数据模型](#数据模型)
- [用户体验流程](#用户体验流程)
- [AI辅助功能](#ai辅助功能)
- [API结构](#api结构)
- [扩展建议](#扩展建议)

## 项目概述

这是一个基于Next.js开发的小说创作辅助应用，集成了AI功能，旨在帮助用户创建、编辑和管理小说内容。应用提供了结构化的创作流程，包括角色创建、大纲生成、章节编写和故事导出等功能，并在各个环节提供AI辅助支持。

## 技术架构

本应用采用现代化的技术栈：

- **前端框架**：Next.js 15 + React 19
- **UI组件库**：Shadcn UI (基于Radix UI)
- **数据库**：Prisma ORM + PostgreSQL
- **认证系统**：Clerk
- **AI服务**：与OpenAI/Gemini兼容的API集成
- **富文本编辑**：TipTap编辑器

主要技术特点：
1. **App Router架构**：利用Next.js 15的App Router架构进行路由管理
2. **API Routes**：使用Next.js API路由与AI服务和数据库交互
3. **React Server Components**：优化首次加载性能
4. **客户端组件**：处理交互式UI元素
5. **Middleware中间件**：处理认证和权限控制

## 数据模型

应用使用Prisma ORM管理数据库模型，主要包含以下实体：

### User 模型
```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String?
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stories    Story[]
  characters Character[]
}
```

### Story 模型
```prisma
model Story {
  id           String   @id @default(cuid())
  title        String
  content      String?  @db.Text
  summary      String?  @db.Text
  worldSetting String?  @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  chapters   Chapter[]
  characters Character[]

  outline     String? @db.Text
  storyStatus String  @default("in_progress")

  @@index([userId])
}
```

### Chapter 模型
```prisma
model Chapter {
  id             String   @id @default(cuid())
  title          String
  content        String   @db.Text
  order          Int
  summary        String?  @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  notes          String?  @db.Text
  versionHistory String?  @db.Text

  storyId String
  story   Story  @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@index([storyId])
  @@index([order])
}
```

### Character 模型
```prisma
model Character {
  id          String   @id @default(cuid())
  name        String
  description String?  @db.Text
  attributes  String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  storyId String
  story   Story  @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([storyId])
}
```

### 数据关系图

```
User(1) --< Story(n) --< Chapter(n)
  |             |
  |             |
  +--< Character(n) >--+
```

### 数据存储策略

1. **已登录用户**：数据存储到PostgreSQL数据库
2. **未登录用户**：数据临时存储到浏览器本地存储
3. **同步机制**：用户登录后可将本地数据同步到服务器

## 用户体验流程

应用提供结构化的小说创作流程，将复杂的创作过程分解为清晰的步骤：

### 1. 用户认证流程
- 使用Clerk进行注册/登录
- 登录成功后重定向到故事管理页面
- 未登录用户仍可使用部分功能，数据存储在本地

### 2. 故事创建和管理
- 用户可在主页创建新故事或访问已有故事
- 每个故事包含创建日期、修改日期、故事状态等元信息
- 故事状态自动追踪，包括：规划中、角色创建、大纲创作、写作中、编辑中、完成

### 3. 创作阶段流程

#### 规划阶段
- 用户创建新故事，输入标题和初步描述
- 系统自动设置状态为"planning"
- 界面提供创作流程概览和引导

#### 角色创建阶段
- 用户可手动创建角色
  - 输入名称、描述和属性
  - 设定角色关系
- 提供AI辅助角色生成功能
  - 基于简单描述生成详细角色信息
  - 支持角色属性自动提取和组织
- 系统将状态更新为"characters"
- 界面显示角色库和角色关系图

#### 大纲创作阶段
- 用户可手动编写故事大纲
- 或使用AI辅助生成：
  - 基于已创建角色生成大纲
  - 根据主题和类型生成结构化大纲
  - 支持大纲修改和重新生成
- 系统将状态更新为"outline"
- 界面支持拖放式大纲章节重排

#### 章节创作阶段
- 基于大纲中的章节结构创建具体章节
- 提供富文本编辑器(TipTap)进行内容创作
- AI辅助功能：
  - 根据大纲节点自动生成章节内容
  - 提供写作建议和续写选项
  - 检查章节间的连贯性和一致性
- 系统将状态更新为"writing"
- 界面显示章节列表和写作进度

#### 编辑完善阶段
- 提供整体故事预览和编辑功能
- AI辅助功能：
  - 故事一致性分析
  - 角色形象分析
  - 情节连贯性检查
  - 提供修改建议
- 系统将状态更新为"editing"
- 用户可对各章节进行修改和完善

#### 导出阶段
- 支持多种格式导出：
  - PDF、EPUB、DOCX等
  - 自定义排版和样式
- 预览完整故事
- 历史版本管理
- 系统将状态更新为"complete"

### 4. 循环迭代流程
- 用户可随时回到前面的阶段修改内容
- 系统自动保存所有更改和历史版本
- AI助手贯穿整个过程提供建议和支持

## AI辅助功能

本应用集成了多种AI功能，以增强小说创作体验。所有AI功能都通过统一的服务层与前端交互，支持降级措施和错误处理。

### AI服务架构

```
+------------------+      +------------------+      +-----------------+
|                  |      |                  |      |                 |
| 用户界面组件     |----->| Next.js API路由   |----->| AI服务调用层    |
| (React组件)      |      | (/api/...)       |      | (lib/ai-utils)  |
|                  |      |                  |      |                 |
+------------------+      +------------------+      +-----------------+
                                  |                        |
                                  |                        v
                                  |              +-----------------+      +-----------------+
                                  |              |                 |      |                 |
                                  |              | 外部AI服务      |<---->| OpenAI/Gemini   |
                                  |              | 接口适配        |      | 兼容API        |
                                  |              |                 |      |                 |
                                  |              +-----------------+      +-----------------+
                                  |
                                  v
                          +-----------------+
                          |                 |
                          | Prisma数据库    |
                          | 操作            |
                          |                 |
                          +-----------------+
```

### 主要AI功能列表

#### 1. 角色描述生成
- **API路径**: `/api/generate/character-description`
- **功能**: 基于简短描述生成丰富详细的角色信息
- **实现**: 使用AI模型理解用户提供的角色概念，扩展为全面的角色描述
- **输出**: 包括性格特点、背景故事、动机、外表描述等

#### 2. 故事大纲生成
- **API路径**: `/api/story/[id]/outline/generate`
- **功能**: 基于已创建角色或主题生成结构化的故事大纲
- **实现**: 分析角色关系和特性，生成符合逻辑的情节发展
- **输出**: 分章节的故事大纲，包含每章核心情节点

#### 3. 章节内容生成
- **API路径**: `/api/user/story/[id]/chapter/generate-from-outline`
- **功能**: 基于大纲节点自动生成章节内容
- **实现**: 考虑前文内容、大纲要求和角色特性生成连贯内容
- **输出**: 符合指定大纲的章节内容文本

#### 4. 写作建议生成
- **API路径**: `/api/generate/writing-suggestion`
- **功能**: 提供实时的写作改进建议
- **实现**: 分析文本结构、风格和内容，提供有针对性的建议
- **输出**: 具体的改进建议列表

#### 5. 故事一致性分析
- **API路径**: `/api/user/story/[id]/analyze-consistency`
- **功能**: 检查故事中的情节、人物和设定一致性
- **实现**: 提取并比对各章节中的关键信息，识别矛盾点
- **输出**: 一致性问题列表和修改建议

#### 6. 故事反馈
- **API路径**: `/api/user/story/[id]/ai-assistant/feedback`
- **功能**: 提供整体故事评价和改进建议
- **实现**: 全面分析故事结构、节奏、角色发展等
- **输出**: 综合评价和改进方向建议

### AI实现技术细节

#### 提示工程

应用使用复杂的提示工程技术优化AI输出：

```javascript
const messages = [
  {
    role: 'system',
    content: '你是一个小说分析助手，请从提供的故事内容中提取关键元素，包括：主要角色（及其特征）、故事发生的地点、重要的情节点、故事中的关键物品或概念、时间背景等。以JSON格式返回这些元素。'
  },
  {
    role: 'user',
    content: `故事内容：${content}`
  }
];
```

#### 内容清洗

针对AI生成的内容，应用实施了严格的清洗流程：

```javascript
function sanitizeGeneratedContent(content: string): string {
  if (!content) return '';

  // 移除可能的提示词泄露模式
  let sanitized = content
    .replace(/^(提示[:：].*?)(?=\n|$)/gm, '')
    .replace(/^(小说内容[:：].*?)(?=\n|$)/gm, '')
    // 更多清洗规则...

  return sanitized;
}
```

#### 错误处理与降级

所有AI功能都包括错误处理和降级机制：

```javascript
try {
  // 调用AI服务
} catch (error) {
  console.error('AI服务错误:', error);

  // 降级策略
  return await withAIFallback(
    async () => { /* 原始函数 */ },
    'fallback-type',
    defaultValue
  );
}
```

### AI服务权限控制

- AI服务API接口受权限保护，需要用户登录
- 未登录用户只能访问有限的AI功能
- 生成服务有使用频率限制，防止滥用

## API结构

应用使用Next.js API Routes实现后端功能，主要分为以下几类：

### 1. 认证相关API
- **中间件保护**：使用Clerk中间件进行路由保护
- **用户API**：`/api/user/me` - 获取当前用户信息

### 2. 故事管理API
- **故事操作**：
  - `/api/user/story` - 创建、获取故事列表
  - `/api/user/story/[id]` - 获取、更新、删除特定故事
- **章节操作**：
  - `/api/user/story/[id]/chapter` - 管理章节列表
  - `/api/user/story/[id]/chapter/[chapterId]` - 操作特定章节
- **大纲操作**：
  - `/api/user/story/[id]/outline` - 获取、更新大纲

### 3. 角色管理API
- **角色操作**：
  - `/api/user/story/[id]/character` - 管理角色列表
  - `/api/user/story/[id]/character/[characterId]` - 操作特定角色
- **角色分析**：
  - `/api/user/story/[id]/character/analyze` - 分析角色关系
  - `/api/user/story/[id]/character/extract` - 从内容中提取角色

### 4. AI生成API
- **基础生成**：
  - `/api/generate` - 通用文本生成入口点
  - `/api/generate/character-description` - 角色描述生成
  - `/api/generate/writing-suggestion` - 写作建议生成
- **故事特定生成**：
  - `/api/story/[id]/outline/generate` - 生成故事大纲
  - `/api/user/story/[id]/chapter/generate-from-outline` - 从大纲生成章节
  - `/api/user/story/[id]/outline/generate-from-characters` - 从角色生成大纲

### 5. 分析和反馈API
- **一致性分析**：
  - `/api/user/story/[id]/analyze-consistency` - 分析故事一致性
- **AI辅助**：
  - `/api/user/story/[id]/ai-assistance` - 通用AI辅助入口点
  - `/api/user/story/[id]/ai-assistant/feedback` - 获取故事反馈

### 6. 导出和集成API
- **导出操作**：
  - `/api/user/story/[id]/export` - 导出故事为多种格式
- **Webhook**：
  - `/api/webhooks/clerk` - Clerk认证系统回调

### API错误处理规范

所有API遵循统一的错误处理模式：

```typescript
try {
  // API处理逻辑
} catch (error) {
  return handleApiException(error, '操作失败');
}
```

错误响应结构：

```json
{
  "error": "错误类型",
  "message": "用户友好的错误消息",
  "statusCode": 400,
  "timestamp": "2025-04-28T05:11:43.000Z",
  "path": "/api/user/story/123"
}
```

## 扩展建议

以下是针对应用未来发展的扩展建议：

### 1. 功能扩展

- **协作写作**：支持多用户同时编辑同一故事
- **版本控制**：更完善的版本历史和比较功能
- **高级分析**：更深入的文本分析和风格检测
- **多语言支持**：支持多种语言的创作和翻译
- **音频生成**：将故事转换为有声读物

### 2. 技术改进

- **流式响应**：对大型AI生成内容使用流式响应
- **WebSocket**：实时协作和通知
- **缓存优化**：针对常用数据进行缓存
- **性能监控**：添加更详细的性能监控指标
- **国际化**：支持多语言界面

### 3. 商业模式建议

- **订阅模式**：基础功能免费，高级AI功能订阅付费
- **成功案例**：展示使用平台创作的优秀作品
- **社区功能**：建立创作者社区，增强用户粘性
- **出版集成**：与电子书平台合作，提供一键发布功能

### 4. 潜在挑战

- **AI生成内容质量控制**：确保AI生成内容的质量和一致性
- **版权问题**：明确用户和AI生成内容的版权归属
- **服务器成本**：随着用户增长，AI处理成本可能迅速增加
- **用户隐私**：确保用户内容的隐私和安全

---

*文档完成于：2025年4月28日*
