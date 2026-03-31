import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface ProjectPath {
  path: string;
  name: string;
  label?: string;
  icons?: string;
  version?: string;
}

export interface SelectorOptions {
  includeAssets?: boolean;
  copyFiles?: boolean;
  cacheDir?: string;
  viteTemplateDir?: string; // Vite 模板目录
  entryName?: string; // 入口文件夹名（可配置，默认 "doc_asset"）
}

export interface DocStructure {
  projectName: string;
  projectPath: string;
  hasReadme: boolean;
  hasAssets: boolean;
  readmePath?: string;
  assetsPath?: string;
  files: string[];
}

export class Selector {
  private cacheDir: string;
  private options: SelectorOptions;

  constructor(options: SelectorOptions = {}) {
    this.options = {
      includeAssets: true,
      copyFiles: true,
      cacheDir: '_caches',
      viteTemplateDir: '_VITETEMPLATE',
      ...options
    };
    this.cacheDir = this.options.cacheDir!;
  }

  /**
   * 从用户给出的路径获取README.md以及doc_assets文件夹
   * @param paths 项目路径数组
   * @param options 选项配置
   * @returns 文档结构数组
   */
  async grepDoctressfromPaths(
    paths: ProjectPath[], 
    options: SelectorOptions = {}
  ): Promise<DocStructure[]> {
    const mergedOptions = { ...this.options, ...options };
    const results: DocStructure[] = [];

    // 缓存目录已废弃，不再创建 _caches
    // await this.ensureCacheDir();

    for (const project of paths) {
      try {
        const docStructure = await this.processProject(project, mergedOptions);
        results.push(docStructure);
      } catch (error) {
        console.error(`处理项目 ${project.name} 时出错:`, error);
        // 继续处理其他项目
      }
    }

    return results;
  }

  /**
   * 处理单个项目
   */
  private async processProject(
    project: ProjectPath, 
    options: SelectorOptions
  ): Promise<DocStructure> {
    const projectPath = project.path;
    const projectName = project.name;
    
    // 检查路径是否存在
    await fs.access(projectPath);
    
    const docStructure: DocStructure = {
      projectName,
      projectPath,
      hasReadme: false,
      hasAssets: false,
      files: []
    };

    // 查找 README.md 文件
    const readmeFiles = await glob('README.md', { 
      cwd: projectPath,
      absolute: true 
    });
    
    if (readmeFiles.length > 0) {
      docStructure.hasReadme = true;
      docStructure.readmePath = readmeFiles[0];
      docStructure.files.push(readmeFiles[0]);
    }

    // 查找入口文件夹（可配置，默认 doc_asset）
    const entryName = mergedOptions.entryName ?? 'doc_asset';
    const assetsPatterns = [`${entryName}/**/*`, 'docs/**/*', 'doc/**/*'];
    const assetsFiles: string[] = [];
    
    for (const pattern of assetsPatterns) {
      const files = await glob(pattern, { 
        cwd: projectPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      });
      assetsFiles.push(...files);
    }

    if (assetsFiles.length > 0) {
      docStructure.hasAssets = true;
      docStructure.assetsPath = path.join(projectPath, entryName);
      docStructure.files.push(...assetsFiles);
    }

    // 如果需要复制文件到缓存目录（已废弃，现在直接复制到 public）
    // if (options.copyFiles) {
    //   await this.copyToCache(project, docStructure);
    // }

    return docStructure;
  }

  /**
   * 复制文件到缓存目录
   */
  private async copyToCache(
    project: ProjectPath, 
    docStructure: DocStructure
  ): Promise<void> {
    const projectCacheDir = path.join(this.cacheDir, 'md', project.name);
    
    // 确保项目缓存目录存在
    await fs.mkdir(projectCacheDir, { recursive: true });

    // 复制 README.md 为 index.md
    if (docStructure.hasReadme && docStructure.readmePath) {
      const readmeContent = await fs.readFile(docStructure.readmePath, 'utf-8');
      await fs.writeFile(
        path.join(projectCacheDir, 'index.md'), 
        readmeContent
      );
    }

    // 复制 doc_assets 文件夹
    if (docStructure.hasAssets && docStructure.assetsPath) {
      const assetsDir = path.join(projectCacheDir, 'assets');
      await fs.mkdir(assetsDir, { recursive: true });
      
      // 复制所有资源文件
      for (const file of docStructure.files) {
        if (file !== docStructure.readmePath) {
          const relativePath = path.relative(project.path, file);
          const destPath = path.join(assetsDir, relativePath);
          const destDir = path.dirname(destPath);
          
          await fs.mkdir(destDir, { recursive: true });
          
          try {
            // 检查源文件是文件还是目录
            const stat = await fs.stat(file);
            if (stat.isDirectory()) {
              // 如果是目录，递归复制
              await this.copyDirectory(file, destPath);
            } else {
              // 如果是文件，直接复制
              await fs.copyFile(file, destPath);
            }
          } catch (error) {
            // 如果是符号链接或其他特殊文件，跳过
            if ((error as any).code === 'ENOTSUP' || (error as any).code === 'EISDIR') {
              console.warn(`跳过特殊文件/目录: ${file}`);
              continue;
            }
            throw error;
          }
        }
      }
    }

    console.log(`✅ 项目 ${project.name} 文档已复制到缓存目录: ${projectCacheDir}`);
  }

  /**
   * 确保缓存目录存在（已废弃）
   */
  private async ensureCacheDir(): Promise<void> {
    // 缓存功能已废弃，不再创建 _caches 目录
    return;
    
    // 以下代码已废弃
    // const cacheDir = path.join(process.cwd(), this.cacheDir);
    // await fs.mkdir(cacheDir, { recursive: true });
    // 
    // const mdDir = path.join(cacheDir, 'md');
    // await fs.mkdir(mdDir, { recursive: true });
  }

  /**
   * 获取缓存目录中的项目列表
   */
  async getCachedProjects(): Promise<string[]> {
    const mdDir = path.join(process.cwd(), this.cacheDir, 'md');
    try {
      const entries = await fs.readdir(mdDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * 为 Vite 项目复制文档文件到 public 目录
   * 保持原始文件结构
   */
  async copyToVitePublic(projects: DocStructure[]): Promise<void> {
    const viteTemplateDir = this.options.viteTemplateDir!;
    const publicDir = path.join(viteTemplateDir, 'public');
    const mdDir = path.join(publicDir, 'md');
    
    // 确保目录存在
    await fs.mkdir(mdDir, { recursive: true });
    
    for (const project of projects) {
      const projectMdDir = path.join(mdDir, project.projectName);
      await fs.mkdir(projectMdDir, { recursive: true });
      
      // 复制 README.md 为 index.md
      if (project.hasReadme && project.readmePath) {
        const readmeContent = await fs.readFile(project.readmePath, 'utf-8');
        await fs.writeFile(
          path.join(projectMdDir, 'index.md'), 
          readmeContent
        );
        console.log(`✅ 已复制 ${project.projectName}/README.md 到 index.md`);
      }
      
      // 复制所有项目文件，保持原始结构
      if (project.files && project.files.length > 0) {
        for (const file of project.files) {
          // 跳过 README.md（已经作为 index.md 复制）
          if (file === project.readmePath) {
            continue;
          }
          
          try {
            const stat = await fs.stat(file);
            
            // 计算相对于项目根目录的相对路径
            const relativePath = path.relative(project.projectPath, file);
            const destPath = path.join(projectMdDir, relativePath);
            const destDir = path.dirname(destPath);
            
            // 创建目标目录
            await fs.mkdir(destDir, { recursive: true });
            
            if (stat.isDirectory()) {
              // 如果是目录，递归复制
              await this.copyDirectory(file, destPath);
            } else {
              // 如果是文件，直接复制
              await fs.copyFile(file, destPath);
            }
            
          } catch (error) {
            if ((error as any).code === 'ENOTSUP' || (error as any).code === 'EISDIR') {
              console.warn(`⚠️ 跳过特殊文件: ${file}`);
              continue;
            }
            throw error;
          }
        }
        console.log(`✅ 已复制 ${project.projectName} 的所有文件，保持原始结构`);
      }
    }
    
    console.log('✅ 所有文档文件已复制到 Vite public 目录');
  }

  /**
   * 清理缓存目录
   */
  async clearCache(): Promise<void> {
    const cacheDir = path.join(process.cwd(), this.cacheDir);
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
      console.log('✅ 缓存目录已清理');
    } catch (error) {
      console.error('清理缓存目录时出错:', error);
    }
  }

  /**
   * 递归复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        try {
          await fs.copyFile(srcPath, destPath);
        } catch (error) {
          // 跳过无法复制的文件
          if ((error as any).code === 'ENOTSUP') {
            console.warn(`跳过特殊文件: ${srcPath}`);
            continue;
          }
          throw error;
        }
      }
    }
  }
}

// 显式导出所有类型（同时使用 export 和 export type 以确保兼容性）
export type { ProjectPath, SelectorOptions, DocStructure };
export { type ProjectPath, type SelectorOptions, type DocStructure };
