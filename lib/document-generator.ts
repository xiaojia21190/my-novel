import PDFDocument from "pdfkit";
import EPub from "epub-gen";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

// 文件系统操作Promise化
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdtemp = promisify(fs.mkdtemp);

// 定义导出选项接口
export interface ExportOptions {
  title: string;
  author?: string;
  characters?: Array<{
    name: string;
    description?: string;
    attributes?: Record<string, any>;
  }>;
  outline?: string;
  chapters: Array<{
    title: string;
    content: string;
  }>;
  includeCharacters?: boolean;
  includeOutline?: boolean;
  fontSize?: number; // PDF字体大小
  fontFamily?: string; // PDF字体
  pageSize?: string; // PDF页面大小
  cover?: Buffer | string; // 封面图片
}

/**
 * 生成PDF文档
 * @param options 导出选项
 * @returns 生成的PDF文件Buffer
 */
export async function generatePDF(options: ExportOptions): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // 创建一个临时目录存储临时文件
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'novel-app-pdf-'));
      const tempFile = path.join(tempDir, `${options.title}.pdf`);

      // 创建一个可写流
      const writeStream = fs.createWriteStream(tempFile);

      // 默认配置
      const pageSize = options.pageSize || "A4";
      const fontSize = options.fontSize || 12;
      const fontFamily = options.fontFamily || "Helvetica";

      // 创建PDF文档
      const doc = new PDFDocument({
        size: pageSize,
        margin: 50,
        info: {
          Title: options.title,
          Author: options.author || "My Novel App",
          Creator: "My Novel App - PDF Generator"
        },
        bufferPages: true,
      });

      // 将PDF流式写入文件
      doc.pipe(writeStream);

      // 设置默认字体和大小
      doc.font(fontFamily).fontSize(fontSize);

      // 添加封面
      doc.fontSize(fontSize * 2)
        .text(options.title, { align: 'center', underline: false })
        .moveDown(2);

      if (options.author) {
        doc.fontSize(fontSize * 1.2)
          .text(`作者: ${options.author}`, { align: 'center' })
          .moveDown(2);
      }

      doc.fontSize(fontSize)
        .text(`由My Novel App生成`, { align: 'center' })
        .moveDown(4);

      // 添加目录页
      doc.addPage()
        .fontSize(fontSize * 1.5)
        .text("目录", { align: 'center' })
        .moveDown(1);

      let tocYPosition = doc.y;
      let currentPage = 2; // 从第2页开始计算内容页（第1页是封面）

      // 角色介绍（如果包含）
      if (options.includeCharacters && options.characters && options.characters.length > 0) {
        doc.fontSize(fontSize * 1.2)
          .text(`角色介绍`, { continued: true })
          .fontSize(fontSize)
          .text(`.....${currentPage}`, { align: 'right' });

        currentPage += Math.ceil(options.characters.length / 3) + 1; // 估算页数
      }

      // 故事大纲（如果包含）
      if (options.includeOutline && options.outline) {
        doc.fontSize(fontSize * 1.2)
          .text(`故事大纲`, { continued: true })
          .fontSize(fontSize)
          .text(`.....${currentPage}`, { align: 'right' });

        currentPage += Math.ceil(options.outline.length / 1500) + 1; // 估算页数
      }

      // 章节目录
      doc.fontSize(fontSize * 1.2)
        .text(`章节内容`, { continued: true })
        .fontSize(fontSize)
        .text(`.....${currentPage}`, { align: 'right' });

      currentPage += 1;
      options.chapters.forEach(chapter => {
        doc.fontSize(fontSize)
          .text(`${chapter.title}`, { continued: true })
          .text(`.....${currentPage}`, { align: 'right' });

        // 估算每章需要的页数（假设每页大约1500个字符）
        currentPage += Math.ceil(chapter.content.length / 1500) + 1;
      });

      // 添加角色介绍（如果选择包含）
      if (options.includeCharacters && options.characters && options.characters.length > 0) {
        doc.addPage()
          .fontSize(fontSize * 1.5)
          .text("角色介绍", { align: 'center' })
          .moveDown(1);

        options.characters.forEach(character => {
          doc.fontSize(fontSize * 1.2)
            .text(character.name)
            .moveDown(0.5);

          if (character.description) {
            doc.fontSize(fontSize)
              .text(character.description, { align: 'justify' })
              .moveDown(0.5);
          }

          if (character.attributes) {
            doc.fontSize(fontSize);
            Object.entries(character.attributes).forEach(([key, value]) => {
              doc.text(`${key}: ${value}`);
            });
          }

          doc.moveDown(1);
        });
      }

      // 添加故事大纲（如果选择包含）
      if (options.includeOutline && options.outline) {
        doc.addPage()
          .fontSize(fontSize * 1.5)
          .text("故事大纲", { align: 'center' })
          .moveDown(1);

        doc.fontSize(fontSize)
          .text(options.outline, { align: 'justify' });
      }

      // 添加章节内容
      doc.addPage()
        .fontSize(fontSize * 1.5)
        .text("章节内容", { align: 'center' })
        .moveDown(2);

      options.chapters.forEach((chapter, index) => {
        // 每章节开始新的一页
        if (index > 0) {
          doc.addPage();
        }

        doc.fontSize(fontSize * 1.3)
          .text(chapter.title, { align: 'center' })
          .moveDown(1);

        // 分段落处理内容
        const paragraphs = chapter.content.split('\n\n');
        paragraphs.forEach(paragraph => {
          doc.fontSize(fontSize)
            .text(paragraph, { align: 'justify' })
            .moveDown(0.5);
        });
      });

      // 添加页码
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        // 跳过封面的页码
        if (i > 0) {
          // 在页面底部居中添加页码
          doc.fontSize(fontSize * 0.8)
            .text(
              `${i + 1} / ${pageCount}`,
              doc.page.width / 2 - 40,
              doc.page.height - 50,
              { width: 80, align: 'center' }
            );
        }
      }

      // 完成PDF生成
      doc.end();

      writeStream.on('finish', async () => {
        // 读取生成的PDF文件
        const pdfBuffer = fs.readFileSync(tempFile);

        // 删除临时文件和目录
        await unlink(tempFile);
        fs.rmdir(tempDir, err => {
          if (err) console.error("清理临时目录失败:", err);
        });

        resolve(pdfBuffer);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 生成EPUB电子书
 * @param options 导出选项
 * @returns 生成的EPUB文件Buffer
 */
export async function generateEPUB(options: ExportOptions): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // 创建一个临时目录存储临时文件
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'novel-app-epub-'));
      const tempFile = path.join(tempDir, `${options.title}.epub`);

      // 准备EPUB选项
      const epubOptions = {
        title: options.title,
        author: options.author || "My Novel App",
        publisher: "My Novel App",
        content: [] as Array<{
          title: string,
          data: string,
          beforeToc?: boolean
        }>,
      };

      // 添加角色介绍（如果包含）
      if (options.includeCharacters && options.characters && options.characters.length > 0) {
        let charactersHTML = "<h1>角色介绍</h1>";

        options.characters.forEach(character => {
          charactersHTML += `<h2>${character.name}</h2>`;

          if (character.description) {
            charactersHTML += `<p>${character.description}</p>`;
          }

          if (character.attributes) {
            charactersHTML += "<ul>";
            Object.entries(character.attributes).forEach(([key, value]) => {
              charactersHTML += `<li><strong>${key}:</strong> ${value}</li>`;
            });
            charactersHTML += "</ul>";
          }
        });

        epubOptions.content.push({
          title: "角色介绍",
          data: charactersHTML,
        });
      }

      // 添加故事大纲（如果包含）
      if (options.includeOutline && options.outline) {
        const outlineHTML = `<h1>故事大纲</h1>${options.outline.split('\n').map(line => `<p>${line}</p>`).join('')}`;

        epubOptions.content.push({
          title: "故事大纲",
          data: outlineHTML,
        });
      }

      // 添加章节
      options.chapters.forEach(chapter => {
        // 将章节内容转换为HTML格式
        const chapterHTML = `<h1>${chapter.title}</h1>${chapter.content.split('\n\n').map(para => `<p>${para}</p>`).join('')}`;

        epubOptions.content.push({
          title: chapter.title,
          data: chapterHTML,
        });
      });

      // 生成EPUB
      const epub = new EPub(epubOptions, tempFile);

      epub.on('end', async () => {
        // 读取生成的EPUB文件
        const epubBuffer = fs.readFileSync(tempFile);

        // 删除临时文件和目录
        await unlink(tempFile);
        fs.rmdir(tempDir, err => {
          if (err) console.error("清理临时目录失败:", err);
        });

        resolve(epubBuffer);
      });

      epub.on('error', (error: any) => {
        reject(error);
      });

      // 生成EPUB
      epub.render();
    } catch (error) {
      reject(error);
    }
  });
}
