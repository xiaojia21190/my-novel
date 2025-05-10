import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  apiError,
  apiSuccess,
  withErrorHandling
} from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

// 定义Character类型
interface Character {
  id: string;
  name: string;
  description?: string | null;
  attributes?: string | null;
  storyId: string;
  userId: string;
}

/**
 * 导出故事
 * POST /api/user/story/[id]/export
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const storyId = params.id;
    if (!storyId) {
      return apiError('无效的请求', '缺少故事ID', 400);
    }

    // 获取请求数据
    const { format = 'txt', includeCharacters = false, includeOutline = false } = await req.json();

    // 验证用户身份
    const auth = await authenticateUser(req);
    if (!auth.isAuthenticated) {
      return auth.response as NextResponse;
    }

    // 获取故事及相关数据
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: { orderBy: { order: 'asc' } },
      }
    });

    if (!story) {
      return apiError('未找到故事', '请求的故事不存在', 404);
    }

    // 验证故事归属
    if (story.userId !== auth.dbUser.id) {
      return apiError('访问被拒绝', '您无权导出此故事', 403);
    }

    // 根据需要获取角色和大纲信息
    let characters: Character[] = [];
    let outline: string | null = null;

    if (includeCharacters) {
      characters = await prisma.character.findMany({
        where: { storyId: storyId }
      }) as Character[];
    }

    if (includeOutline) {
      outline = story.outline;
    }

    // 生成文本内容
    let content = `# ${story.title}\n\n`;

    // 添加角色信息
    if (includeCharacters && characters.length > 0) {
      content += `## 角色介绍\n\n`;
      characters.forEach(character => {
        content += `### ${character.name}\n`;
        if (character.description) {
          content += `${character.description}\n\n`;
        }
        if (character.attributes) {
          try {
            const attrs = JSON.parse(character.attributes);
            Object.entries(attrs).forEach(([key, value]) => {
              content += `- ${key}: ${value}\n`;
            });
            content += `\n`;
          } catch (e) {
            // 忽略解析错误
          }
        }
      });
      content += `\n`;
    }

    // 添加大纲
    if (includeOutline && outline) {
      content += `## 故事大纲\n\n${outline}\n\n`;
    }

    // 添加章节内容
    content += `## 正文\n\n`;
    story.chapters.forEach(chapter => {
      content += `### ${chapter.title}\n\n${chapter.content}\n\n`;
    });

    // 根据格式返回不同内容
    switch (format) {
      case 'txt':
        // 纯文本格式
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(story.title)}.txt"`
          }
        });

      case 'html':
        // HTML格式
        const htmlContent = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${story.title}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { text-align: center; }
            h2 { margin-top: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.5em; }
            h3 { margin-top: 1.5em; }
            .character { margin-bottom: 1.5em; }
            .chapter { margin-bottom: 3em; }
          </style>
        </head>
        <body>
          <h1>${story.title}</h1>

          ${includeCharacters && characters.length > 0 ? `
          <h2>角色介绍</h2>
          ${characters.map(char => `
            <div class="character">
              <h3>${char.name}</h3>
              <p>${char.description || ''}</p>
              ${char.attributes ? (() => {
            try {
              const attrs = JSON.parse(char.attributes);
              return `
                    <ul>
                      ${Object.entries(attrs).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
                    </ul>
                  `;
            } catch (e) {
              return '';
            }
          })() : ''}
            </div>
          `).join('')}
          ` : ''}

          ${includeOutline && outline ? `
          <h2>故事大纲</h2>
          <div class="outline">
            ${outline.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          ` : ''}

          <h2>正文</h2>
          ${story.chapters.map(chapter => `
            <div class="chapter">
              <h3>${chapter.title}</h3>
              ${chapter.content.split('\n\n').map(para => `<p>${para}</p>`).join('')}
            </div>
          `).join('')}
        </body>
        </html>`;

        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(story.title)}.html"`
          }
        });

      // 对于PDF和EPUB格式，这里简化处理为文本格式
      // 实际项目中需要添加相应的库来生成这些格式
      case 'pdf':
      case 'epub':
      default:
        // 简化示例：返回文本格式作为后备
        return new NextResponse(
          `注意：${format}格式正在开发中，暂时提供TXT格式。\n\n` + content,
          {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(story.title)}.txt"`
            }
          }
        );
    }
  }, '导出故事失败');
}
