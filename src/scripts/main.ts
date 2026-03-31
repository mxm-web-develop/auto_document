/**
 * MainController - 核心流程编排器
 *
 * 整合 Selector / Collector / Renderer / ViteBuilder，
 * 按 mode（dev / build / preview）执行完整文档生成流程。
 */
import { DocsGenerator } from '../core/index.js';
import type { ProjectPath } from '../core/index.js';
import { ViteBuilder } from '../core/ViteBuilder.js';

export interface MainControllerOptions {
  projectPaths: string[];
  mode: 'dev' | 'build' | 'preview';
  port?: number;
  templateDir?: string;
  forceRegenerate?: boolean;
  outputDir?: string;
  previewDir?: string;
  projectConfigs?: Record<string, any>;
  entryName?: string;
}

export class MainController {
  private options: Required<MainControllerOptions>;

  constructor(options: MainControllerOptions) {
    this.options = {
      port: 3000,
      templateDir: '_VITETEMPLATE',
      forceRegenerate: false,
      outputDir: '_outputs',
      previewDir: undefined,
      projectConfigs: {},
      entryName: 'doc_asset',
      ...options,
    };
  }

  /**
   * 执行完整流程
   */
  async run(): Promise<void> {
    const { mode, projectPaths } = this.options;

    if (mode === 'preview') {
      await this.runPreview();
      return;
    }

    // dev 和 build 模式：先收集数据、生成/更新模板、注入数据
    await this.prepareViteTemplate(projectPaths);

    if (mode === 'build') {
      await this.runBuild();
    } else {
      await this.runDev();
    }
  }

  /**
   * 准备 Vite 模板（生成模板、安装依赖、注入数据）
   */
  private async prepareViteTemplate(projectPaths: string[]): Promise<void> {
    const { templateDir, projectConfigs, entryName } = this.options;

    // 构造 ProjectPath[]（符合 Selector 期望的格式）
    const docsProjectPaths: ProjectPath[] = projectPaths.map(p => ({
      path: p,
      name: '',
    }));

    // 创建文档生成器（带 entryName 参数化）
    const docsGenerator = new DocsGenerator({
      entryName,
      vite: {
        templateDir,
        mode: this.options.mode,
        port: this.options.port,
        outputDir: this.options.outputDir,
      },
    });

    // 检查模板是否存在，不存在则生成
    const templateExists = await docsGenerator.viteBuilder.checkTemplate();
    if (!templateExists) {
      console.log('📝 生成 Vite 模板...');
      await docsGenerator.generateViteTemplate();
    }

    // 安装依赖（跳过 if 已安装）
    await docsGenerator.viteBuilder.installDependencies();

    // 收集文档数据
    console.log('📚 收集文档数据...');
    const data = await docsGenerator.collector.collectProjects(docsProjectPaths);
    console.log(`✅ 收集完成: ${data.metadata.totalProjects} 个项目`);

    // 注入数据到 Vite 模板
    console.log('💉 注入文档数据到 Vite 项目...');
    await docsGenerator.viteBuilder.injectDocData(data);
    console.log('✅ 数据注入完成');
  }

  /**
   * 开发模式：启动 Vite 开发服务器
   */
  private async runDev(): Promise<void> {
    const { templateDir, port } = this.options;

    console.log('🚀 启动 Vite 开发服务器...');
    const viteBuilder = new ViteBuilder({ templateDir, mode: 'dev', port });
    await viteBuilder.startDevServer();
  }

  /**
   * 构建模式：构建生产版本
   */
  private async runBuild(): Promise<void> {
    const { templateDir } = this.options;

    console.log('🔨 构建生产版本...');
    const viteBuilder = new ViteBuilder({ templateDir, mode: 'build' });
    await viteBuilder.buildProduction();
    console.log('✅ 构建完成！');
  }

  /**
   * 预览模式：直接启动预览服务器
   */
  private async runPreview(): Promise<void> {
    const { templateDir, port, previewDir } = this.options;

    console.log('🔍 启动预览服务器...');
    const viteBuilder = new ViteBuilder({ templateDir, mode: 'preview', port, previewDir });
    await viteBuilder.preview();
  }
}
