import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateUser, apiError, withErrorHandling } from '@/lib/api-helpers';
import { Character } from '@/lib/api-service';
import { generatePDF, generateEPUB, ExportOptions } from '@/lib/document-generator';

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
    const {
      format = 'txt',
      includeCharacters = false,
      includeOutline = false,
      fontSize,
      fontFamily,
      pageSize
    } = await req.json();

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

    // 准备导出选项
    const exportOptions: ExportOptions = {
      title: story.title,
      author: auth.dbUser.name || undefined,
      chapters: story.chapters.map(ch => ({
        title: ch.title,
        content: ch.content || ''
      })),
      includeCharacters,
      includeOutline,
      fontSize,
      fontFamily,
      pageSize
    };

    // 根据需要获取角色和大纲信息
    if (includeCharacters) {
      const characters = await prisma.character.findMany({
        where: { storyId: storyId }
      });
      exportOptions.characters = characters.map(char => ({
        name: char.name,
        description: char.description || undefined,
        attributes: char.attributes ? JSON.parse(char.attributes) : undefined
      }));
    }

    if (includeOutline && story.outline) {
      exportOptions.outline = story.outline;
    }

    // 根据格式返回不同内容
    switch (format) {
      case 'pdf':
        try {
          const pdfBuffer = await generatePDF(exportOptions);
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(story.title)}.pdf"`
            }
          });
        } catch (error) {
          console.error("生成PDF失败:", error);
          return apiError('导出失败', '生成PDF文档时发生错误', 500);
        }

      case 'epub':
        try {
          const epubBuffer = await generateEPUB(exportOptions);
          return new NextResponse(epubBuffer, {
            headers: {
              'Content-Type': 'application/epub+zip',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(story.title)}.epub"`
            }
          });
        } catch (error) {
          console.error("生成EPUB失败:", error);
          return apiError('导出失败', '生成EPUB电子书时发生错误', 500);
        }

      case 'txt':
        // 纯文本格式
        let content = `# ${story.title}\n\n`;

        // 添加角色信息
        if (includeCharacters && exportOptions.characters && exportOptions.characters.length > 0) {
          content += `## 角色介绍\n\n`;
          exportOptions.characters.forEach(character => {
            content += `### ${character.name}\n`;
            if (character.description) {
              content += `${character.description}\n\n`;
            }
            if (character.attributes) {
              Object.entries(character.attributes).forEach(([key, value]) => {
                content += `- ${key}: ${value}\n`;
              });
              content += `\n`;
            }
          });
        }

        // 添加大纲
        if (includeOutline && exportOptions.outline) {
          content += `## 故事大纲\n\n${exportOptions.outline}\n\n`;
        }

        // 添加章节内容
        content += `## 正文\n\n`;
        exportOptions.chapters.forEach(chapter => {
          content += `### ${chapter.title}\n\n${chapter.content}\n\n`;
        });

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

          ${includeCharacters && exportOptions.characters && exportOptions.characters.length > 0 ? `
          <h2>角色介绍</h2>
          ${exportOptions.characters.map(char => `
            <div class="character">
              <h3>${char.name}</h3>
              <p>${char.description || ''}</p>
              ${char.attributes ? `
                <ul>
                  ${Object.entries(char.attributes).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
          ` : ''}

          ${includeOutline && exportOptions.outline ? `
          <h2>故事大纲</h2>
          <div class="outline">
            ${exportOptions.outline.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          ` : ''}

          <h2>正文</h2>
          ${exportOptions.chapters.map(chapter => `
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

      default:
        return apiError('无效的格式', `不支持的导出格式: ${format}`, 400);
    }
  }, '导出故事失败');
}
