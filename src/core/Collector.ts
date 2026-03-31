import { promises as fs } from 'fs';
import path from 'path';
import { Selector, ProjectPath, type DocStructure } from './Selector.js';

// 重新导出 DocStructure
export type { DocStructure } from './Selector.js';

export interface CollectionOptions {
  includeGitHistory?: boolean;
  includePackageInfo?: boolean;
  includeDependencies?: boolean;
  generateChangelog?: boolean;
}

export interface CollectedData {
  projects: DocStructure[];
  metadata: {
    totalProjects: number;
    projectsWithDocs: number;
    projectsWithAssets: number;
    collectionTime: string;
  };
  changelog?: any;
  // 为 zui-layouts 提供的数据格式
  modules: Array<{
    key: string;
    label: string;
    items: Array<{
      id: string;
      label: string;
      slug: string;
      group: string;
    }>;
  }>;
}

export class Collector {
  private selector: Selector;
  private options: CollectionOptions;

  constructor(options: CollectionOptions = {}) {
    this.options = {
      includeGitHistory: true,
      includePackageInfo: true,
      includeDependencies: false,
      generateChangelog: true,
      ...options
    };
    this.selector = new Selector();
  }

  /**
   * 收集项目文档数据
   */
  async collectProjects(projectPaths: ProjectPath[]): Promise<CollectedData> {
    console.log('🔍 开始收集项目文档数据...');
    
    // 使用 Selector 收集文档结构
    const projects = await this.selector.grepDoctressfromPaths(projectPaths);
    
    // 收集额外元数据
    const enrichedProjects = await this.enrichProjects(projects);
    
    // 生成变更日志（如果需要）
    let changelog;
    if (this.options.generateChangelog) {
      changelog = await this.generateChangelog(enrichedProjects);
    }

    const metadata = {
      totalProjects: projects.length,
      projectsWithDocs: projects.filter(p => p.hasReadme).length,
      projectsWithAssets: projects.filter(p => p.hasAssets).length,
      collectionTime: new Date().toISOString()
    };

    // 生成 zui-layouts 所需的模块数据
    const modules = this.generateModulesData(enrichedProjects);

    console.log(`✅ 收集完成: ${metadata.totalProjects} 个项目, ${metadata.projectsWithDocs} 个有文档`);

    return {
      projects: enrichedProjects,
      metadata,
      changelog,
      modules
    };
  }

  /**
   * 丰富项目数据
   */
  private async enrichProjects(projects: DocStructure[]): Promise<DocStructure[]> {
    const enriched = [];

    for (const project of projects) {
      const enrichedProject = { ...project };

      // 收集 package.json 信息
      if (this.options.includePackageInfo) {
        const packageInfo = await this.collectPackageInfo(project.projectPath);
        Object.assign(enrichedProject, packageInfo);
      }

      // 收集 Git 信息
      if (this.options.includeGitHistory) {
        const gitInfo = await this.collectGitInfo(project.projectPath);
        Object.assign(enrichedProject, gitInfo);
      }

      // 收集依赖信息
      if (this.options.includeDependencies) {
        const depsInfo = await this.collectDependencies(project.projectPath);
        Object.assign(enrichedProject, depsInfo);
      }

      enriched.push(enrichedProject);
    }

    return enriched;
  }

  /**
   * 收集 package.json 信息
   */
  private async collectPackageInfo(projectPath: string): Promise<any> {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageData = JSON.parse(packageContent);
      
      return {
        packageName: packageData.name,
        version: packageData.version,
        description: packageData.description,
        author: packageData.author,
        license: packageData.license,
        homepage: packageData.homepage,
        repository: packageData.repository,
        keywords: packageData.keywords,
        scripts: packageData.scripts
      };
    } catch (error) {
      console.warn(`无法读取 ${projectPath}/package.json:`, (error as Error).message);
      return {};
    }
  }

  /**
   * 收集 Git 信息
   */
  private async collectGitInfo(projectPath: string): Promise<any> {
    try {
      const { execSync } = await import('child_process');
      
      // 检查是否为 Git 仓库
      const isGitRepo = await this.isGitRepository(projectPath);
      if (!isGitRepo) {
        return { isGitRepo: false };
      }

      // 获取 Git 信息
      const gitInfo = {
        isGitRepo: true,
        currentBranch: execSync('git branch --show-current', { 
          cwd: projectPath, 
          encoding: 'utf-8' 
        }).trim(),
        lastCommit: execSync('git log -1 --format="%H|%an|%ae|%ad|%s"', { 
          cwd: projectPath, 
          encoding: 'utf-8' 
        }).trim(),
        totalCommits: execSync('git rev-list --count HEAD', { 
          cwd: projectPath, 
          encoding: 'utf-8' 
        }).trim()
      };

      return gitInfo;
    } catch (error) {
      console.warn(`无法获取 ${projectPath} 的 Git 信息:`, (error as Error).message);
      return { isGitRepo: false };
    }
  }

  /**
   * 检查是否为 Git 仓库
   */
  private async isGitRepository(projectPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(projectPath, '.git');
      const stat = await fs.stat(gitDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 收集依赖信息
   */
  private async collectDependencies(projectPath: string): Promise<any> {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageData = JSON.parse(packageContent);
      
      return {
        dependencies: packageData.dependencies || {},
        devDependencies: packageData.devDependencies || {},
        peerDependencies: packageData.peerDependencies || {},
        totalDependencies: Object.keys(packageData.dependencies || {}).length +
                          Object.keys(packageData.devDependencies || {}).length
      };
    } catch (error) {
      console.warn(`无法读取 ${projectPath} 的依赖信息:`, (error as Error).message);
      return {};
    }
  }

  /**
   * 生成变更日志
   */
  private async generateChangelog(projects: DocStructure[]): Promise<any> {
    // 这里可以集成 semantic-release 或其他 changelog 生成工具
    // 暂时返回基础结构
    return {
      generated: true,
      timestamp: new Date().toISOString(),
      projects: projects.map(p => ({
        name: p.projectName,
        hasChanges: false, // 需要实现 Git 变更检测
        lastUpdate: (p as any).lastCommit?.split('|')[3] || 'unknown'
      }))
    };
  }

  /**
   * 从缓存目录加载已收集的数据
   */
  async loadFromCache(): Promise<CollectedData | null> {
    try {
      const cacheFile = path.join(process.cwd(), this.selector['cacheDir'], 'collected-data.json');
      const content = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('无法从缓存加载数据:', (error as Error).message);
      return null;
    }
  }

  /**
   * 生成 zui-layouts 所需的模块数据
   * 扫描文件列表，生成完整的侧边栏结构
   */
  private generateModulesData(projects: DocStructure[]): Array<{
    key: string;
    label: string;
    items: Array<{
      id: string;
      label: string;
      slug: string;
      group: string;
    }>;
  }> {
    return projects.map(project => {
      const items = [];
      
      // 添加主文档
      if (project.hasReadme) {
        items.push({
          id: `${project.projectName}_index`, // 确保 id 包含项目名以全局唯一
          label: '概述',
          slug: `md/${project.projectName}/index.md`,
          group: '概述'
        });
      }

      // 扫描文件列表，识别文档文件
      if (project.files && project.files.length > 0) {
        // 提取所有 .md 文件（排除 README.md，因为已经作为 index.md 处理）
        const mdFiles = project.files.filter(file => {
          const fileName = path.basename(file);
          return file.endsWith('.md') && fileName !== 'README.md';
        });

        // 按目录分组
        const groupedFiles = this.groupFilesByDirectory(mdFiles, project.projectPath);
        
        // 为每个文件生成侧边栏项
        for (const [groupPath, files] of Object.entries(groupedFiles)) {
          const groupName = this.getGroupName(groupPath, project.projectPath);
          
          for (const file of files) {
            const relativePath = path.relative(project.projectPath, file);
            const slug = `md/${project.projectName}/${relativePath}`;
            const fileName = path.basename(file, '.md');
            const id = relativePath.replace(/\//g, '_').replace(/\.md$/, '');
            
            items.push({
              id: `${project.projectName}_${id}`, // 确保 id 包含项目名以全局唯一
              label: this.getLabel(fileName),
              slug: slug,
              group: groupName
            });
          }
        }
      }

      return {
        key: project.projectName,
        label: project.projectName,
        items: items
      };
    });
  }

  /**
   * 按目录分组文件
   */
  private groupFilesByDirectory(files: string[], projectPath: string): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    
    for (const file of files) {
      const relativePath = path.relative(projectPath, file);
      const dirPath = path.dirname(relativePath);
      const groupPath = dirPath === '.' ? '' : dirPath;
      
      if (!groups[groupPath]) {
        groups[groupPath] = [];
      }
      groups[groupPath].push(file);
    }
    
    return groups;
  }

  /**
   * 获取分组名称
   * 根据实际文件夹结构自动生成，不再硬编码映射
   */
  private getGroupName(dirPath: string, projectPath: string): string {
    if (!dirPath) return '概述';
    
    // 使用目录名，自动转换
    const dirName = path.basename(dirPath);
    return this.getLabel(dirName);
  }

  /**
   * 生成友好的标签
   */
  private getLabel(fileName: string): string {
    // 将文件名转换为友好标签
    return fileName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * 保存收集的数据到缓存
   * 注：缓存功能已废弃，此方法保留以兼容旧接口
   */
  async saveToCache(data: CollectedData): Promise<void> {
    // 缓存功能已废弃，不再创建 _caches 目录
    console.log('ℹ️ 缓存功能已废弃，跳过保存到 _caches');
    return;
    
    // 以下代码已废弃
    // try {
    //   const cacheFile = path.join(process.cwd(), this.selector['cacheDir'], 'collected-data.json');
    //   await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
    //   console.log('✅ 数据已保存到缓存');
    // } catch (error) {
    //   console.error('保存数据到缓存时出错:', (error as Error).message);
    // }
  }
}
