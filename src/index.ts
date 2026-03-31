import { MainController } from './scripts/main.js';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * 项目配置接口（来自 projectTree.json）
 */
export interface ProjectConfig {
  uid?: string;
  isDir?: boolean;
  hasDoc?: boolean;
  isLibExports?: boolean;
  package_name?: string;
  file_name?: string;
  project_name?: string;
  description?: string;
  author?: string;
  logo?: string;
  title?: string;
  version?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  license?: string;
  path?: string;
  absolute_path: string; // 必需字段
  project_type?: number;
  cli_type?: number;
  export_type?: number;
}

/**
 * 运行模式
 */
export type RunMode = 'dev' | 'build' | 'preview';

/**
 * 运行选项
 */
export interface RunOptions {
  mode?: RunMode;
  port?: number;
  templateDir?: string;
  forceRegenerate?: boolean;
  outputDir?: string; // 追加：控制最终拷贝输出目录（可为嵌套路径，相对调用方 cwd）
  previewDir?: string; // 追加：预览模式下要服务的目录（优先级最高）
  entryName?: string; // 入口文件夹名（可配置，默认 "doc_asset"）
}

/**
 * 运行文档生成器
 * 
 * @param pathconfigs 项目配置数组（必需字段：absolute_path，其他字段可选）
 * @param mode 运行模式 'dev' | 'build' | 'preview'
 * @param options 额外选项
 * 
 * @example
 * ```typescript
 * import { runGenerator } from '@mxmweb/docs-generator';
 * 
 * runGenerator([
 *   {
 *     absolute_path: '/path/to/project',
 *     project_name: 'My Project',
 *     title: '我的项目',
 *     description: '项目描述'
 *   }
 * ], 'dev', { port: 3000 });
 * ```
 */
export async function runGenerator(
  pathconfigs: ProjectConfig[],
  mode: RunMode = 'dev',
  options: RunOptions = {}
): Promise<void> {
  console.log('📚 启动文档生成器...');
  console.log('='.repeat(60));
  console.log(`模式: ${mode}`);
  console.log(`项目数量: ${pathconfigs.length}`);
  console.log('='.repeat(60));
  console.log('');

  // 提取项目路径
  const projectPaths = pathconfigs.map(config => config.absolute_path);
  
  // 提取项目配置，用于后续应用
  const projectConfigs: Record<string, any> = {};
  for (const config of pathconfigs) {
    if (config.absolute_path) {
      const projectName = path.basename(config.absolute_path);
      projectConfigs[projectName] = {
        title: config.title || config.project_name || projectName,
        description: config.description || '',
        showdocs: config.hasDoc !== false,
        logo: config.logo || '',
        version: config.version || '',
        author: config.author || '',
      };
    }
  }

  // 创建控制器
  const controller = new MainController({
    projectPaths,
    mode,
    port: options.port || 3000,
    templateDir: options.templateDir || '_VITETEMPLATE',
    forceRegenerate: options.forceRegenerate || false,
    // 透传输出配置
    outputDir: options.outputDir,
    previewDir: options.previewDir,
    projectConfigs, // 传递用户配置
    entryName: options.entryName,
  });

  try {
    console.log('🚀 开始执行完整流程...');
    await controller.run();
    console.log('');
    console.log('✅ 完整流程执行成功！');
    
    if (mode === 'dev') {
      console.log(`💡 现在可以访问 http://localhost:${options.port || 3000} 查看文档`);
      console.log('💡 按 Ctrl+C 停止服务器');
    }
  } catch (error) {
    console.error('❌ 执行出错:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error));
    }
  }
}

// 默认导出
export default { runGenerator };

