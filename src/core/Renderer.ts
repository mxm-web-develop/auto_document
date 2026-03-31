import { promises as fs } from 'fs';
import path from 'path';
import { CollectedData, DocStructure } from './Collector.js';

export interface RenderOptions {
  outputDir?: string;
  templateDir?: string;
  includeAssets?: boolean;
  generateIndex?: boolean;
  theme?: 'default' | 'dark' | 'minimal';
  // 作为 Vite 方案的备用选择
  isFallback?: boolean;
}

export interface RenderResult {
  success: boolean;
  outputPath: string;
  files: string[];
  errors: string[];
}

/**
 * 静态 HTML 渲染器
 * 作为 Vite + React 方案的备用选择
 * 用于生成纯静态 HTML 文档，无需 JavaScript 运行环境
 */
export class Renderer {
  private outputDir: string;
  private templateDir: string;
  private options: RenderOptions;

  constructor(options: RenderOptions = {}) {
    this.options = {
      outputDir: '_outputs',
      templateDir: 'templates',
      includeAssets: true,
      generateIndex: true,
      theme: 'default',
      isFallback: false,
      ...options
    };
    this.outputDir = this.options.outputDir!;
    this.templateDir = this.options.templateDir!;
  }

  /**
   * 渲染文档为 HTML
   */
  async render(data: CollectedData): Promise<RenderResult> {
    console.log('🎨 开始渲染文档...');
    
    const result: RenderResult = {
      success: true,
      outputPath: this.outputDir,
      files: [],
      errors: []
    };

    try {
      // 确保输出目录存在
      await this.ensureOutputDir();

      // 渲染每个项目
      for (const project of data.projects) {
        try {
          const projectFiles = await this.renderProject(project);
          result.files.push(...projectFiles);
        } catch (error) {
          const errorMsg = `渲染项目 ${project.projectName} 时出错: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 生成索引页面
      if (this.options.generateIndex) {
        try {
          const indexFile = await this.generateIndex(data);
          result.files.push(indexFile);
        } catch (error) {
          const errorMsg = `生成索引页面时出错: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 复制静态资源
      if (this.options.includeAssets) {
        try {
          await this.copyStaticAssets();
        } catch (error) {
          const errorMsg = `复制静态资源时出错: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      console.log(`✅ 渲染完成: ${result.files.length} 个文件生成到 ${result.outputPath}`);

    } catch (error) {
      result.success = false;
      result.errors.push(`渲染过程中出错: ${(error as Error).message}`);
      console.error('渲染过程中出错:', error);
    }

    return result;
  }

  /**
   * 渲染单个项目
   */
  private async renderProject(project: DocStructure): Promise<string[]> {
    const files: string[] = [];
    const projectOutputDir = path.join(this.outputDir, project.projectName);
    
    // 确保项目输出目录存在
    await fs.mkdir(projectOutputDir, { recursive: true });

    // 渲染 README.md
    if (project.hasReadme) {
      const readmeFile = await this.renderMarkdownFile(
        project.readmePath!,
        project,
        path.join(projectOutputDir, 'index.html')
      );
      files.push(readmeFile);
    }

    // 渲染资源文件
    if (project.hasAssets) {
      const assetsFiles = await this.renderAssets(project, projectOutputDir);
      files.push(...assetsFiles);
    }

    return files;
  }

  /**
   * 渲染 Markdown 文件
   */
  private async renderMarkdownFile(
    markdownPath: string,
    project: DocStructure,
    outputPath: string
  ): Promise<string> {
    const markdownContent = await fs.readFile(markdownPath, 'utf-8');
    
    // 简单的 Markdown 到 HTML 转换
    // 这里可以集成更强大的 Markdown 解析器
    const htmlContent = this.markdownToHtml(markdownContent);
    
    // 生成完整的 HTML 页面
    const fullHtml = this.generatePageHtml(htmlContent, project);
    
    await fs.writeFile(outputPath, fullHtml);
    return outputPath;
  }

  /**
   * 简单的 Markdown 到 HTML 转换
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      // 标题
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 代码块
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // 段落
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, '<p>$1</p>');
  }

  /**
   * 生成完整的 HTML 页面
   */
  private generatePageHtml(content: string, project: DocStructure): string {
    const theme = this.options.theme || 'default';
    const title = project.projectName || 'Documentation';
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${this.getThemeCSS(theme)}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${title}</h1>
            ${(project as any).version ? `<span class="version">v${(project as any).version}</span>` : ''}
        </header>
        
        <main class="content">
            ${content}
        </main>
        
        <footer class="footer">
            <p>Generated by @mxmweb/docs-generator</p>
            <p>Last updated: ${new Date().toLocaleString()}</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * 获取主题 CSS
   */
  private getThemeCSS(theme: string): string {
    const themes = {
      default: `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; min-height: 100vh; }
        .header { background: #2c3e50; color: white; padding: 2rem; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .version { background: #3498db; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.9rem; margin-left: 1rem; }
        .content { padding: 2rem; line-height: 1.6; }
        .content h1, .content h2, .content h3 { color: #2c3e50; margin-top: 2rem; }
        .content code { background: #f8f9fa; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
        .content pre { background: #f8f9fa; padding: 1rem; border-radius: 5px; overflow-x: auto; }
        .content pre code { background: none; padding: 0; }
        .footer { background: #ecf0f1; padding: 1rem 2rem; text-align: center; color: #7f8c8d; font-size: 0.9rem; }
      `,
      dark: `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #1a1a1a; color: #e0e0e0; }
        .container { max-width: 1200px; margin: 0 auto; background: #2d2d2d; min-height: 100vh; }
        .header { background: #1a1a1a; color: #e0e0e0; padding: 2rem; text-align: center; border-bottom: 1px solid #444; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .version { background: #4a9eff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.9rem; margin-left: 1rem; }
        .content { padding: 2rem; line-height: 1.6; }
        .content h1, .content h2, .content h3 { color: #4a9eff; margin-top: 2rem; }
        .content code { background: #3a3a3a; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
        .content pre { background: #3a3a3a; padding: 1rem; border-radius: 5px; overflow-x: auto; }
        .content pre code { background: none; padding: 0; }
        .footer { background: #1a1a1a; padding: 1rem 2rem; text-align: center; color: #888; font-size: 0.9rem; border-top: 1px solid #444; }
      `,
      minimal: `
        body { font-family: 'Georgia', serif; margin: 0; padding: 0; background: white; }
        .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid #eee; }
        .header h1 { margin: 0; font-size: 2rem; color: #333; }
        .version { color: #666; font-size: 0.9rem; margin-left: 1rem; }
        .content { line-height: 1.8; color: #444; }
        .content h1, .content h2, .content h3 { color: #333; margin-top: 2rem; }
        .content code { background: #f5f5f5; padding: 0.1rem 0.3rem; border-radius: 2px; font-family: 'Monaco', 'Consolas', monospace; }
        .content pre { background: #f5f5f5; padding: 1rem; border-radius: 3px; overflow-x: auto; }
        .content pre code { background: none; padding: 0; }
        .footer { margin-top: 3rem; padding-top: 2rem; text-align: center; color: #999; font-size: 0.8rem; border-top: 1px solid #eee; }
      `
    };

    return themes[theme as keyof typeof themes] || themes.default;
  }

  /**
   * 渲染资源文件
   */
  private async renderAssets(project: DocStructure, outputDir: string): Promise<string[]> {
    const files: string[] = [];
    const assetsDir = path.join(outputDir, 'assets');
    
    // 确保资源目录存在
    await fs.mkdir(assetsDir, { recursive: true });

    // 这里可以添加更多资源文件的处理逻辑
    // 比如图片、PDF、视频等

    return files;
  }

  /**
   * 生成索引页面
   */
  private async generateIndex(data: CollectedData): Promise<string> {
    const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>项目文档索引</title>
    <style>
        ${this.getThemeCSS(this.options.theme || 'default')}
        .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; }
        .project-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .project-card h3 { margin: 0 0 1rem 0; color: #2c3e50; }
        .project-card p { color: #666; margin: 0.5rem 0; }
        .project-card a { display: inline-block; background: #3498db; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin-top: 1rem; }
        .project-card a:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>项目文档索引</h1>
            <p>共 ${data.metadata.totalProjects} 个项目，${data.metadata.projectsWithDocs} 个有文档</p>
        </header>
        
        <main class="content">
            <div class="project-grid">
                ${data.projects.map(project => `
                    <div class="project-card">
                        <h3>${project.projectName}</h3>
                        ${(project as any).description ? `<p>${(project as any).description}</p>` : ''}
                        ${(project as any).version ? `<p>版本: ${(project as any).version}</p>` : ''}
                        <p>状态: ${project.hasReadme ? '有文档' : '无文档'} ${project.hasAssets ? '+ 资源' : ''}</p>
                        ${project.hasReadme ? `<a href="${project.projectName}/index.html">查看文档</a>` : ''}
                    </div>
                `).join('')}
            </div>
        </main>
        
        <footer class="footer">
            <p>Generated by @mxmweb/docs-generator</p>
            <p>生成时间: ${data.metadata.collectionTime}</p>
        </footer>
    </div>
</body>
</html>`;

    const indexPath = path.join(this.outputDir, 'index.html');
    await fs.writeFile(indexPath, indexHtml);
    return indexPath;
  }

  /**
   * 复制静态资源
   */
  private async copyStaticAssets(): Promise<void> {
    // 这里可以复制 CSS、JS、图片等静态资源
    // 暂时跳过
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }
}
