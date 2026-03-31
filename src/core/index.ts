// 导入所有核心模块
import { Selector } from './Selector.js';
import type { ProjectPath, SelectorOptions, DocStructure } from './Selector.js';
import { Collector } from './Collector.js';
import type { CollectionOptions, CollectedData } from './Collector.js';
import { Renderer } from './Renderer.js';
import type { RenderOptions, RenderResult } from './Renderer.js';
import { ViteTemplateGenerator } from './ViteTemplateGenerator.js';
import type { ViteTemplateOptions } from './ViteTemplateGenerator.js';
import { ViteBuilder } from './ViteBuilder.js';
import type { ViteBuildOptions } from './ViteBuilder.js';

// 重新导出
export { Selector, Collector, Renderer, ViteTemplateGenerator, ViteBuilder };
export type { ProjectPath, SelectorOptions, DocStructure, CollectionOptions, CollectedData, RenderOptions, RenderResult, ViteTemplateOptions, ViteBuildOptions };

// 导出便捷的工厂函数
export class DocsGenerator {
  public selector: Selector;
  public collector: Collector;
  public renderer: Renderer;
  public viteBuilder: ViteBuilder;

  constructor(options: {
    selector?: SelectorOptions;
    collector?: CollectionOptions;
    renderer?: RenderOptions;
    vite?: ViteBuildOptions;
    entryName?: string; // 入口文件夹名，透传给 Selector
  } = {}) {
    // 将 entryName 注入到 selector options 中
    const selectorOpts: SelectorOptions = {
      ...options.selector,
      entryName: options.entryName ?? options.selector?.entryName ?? 'doc_asset',
    };
    this.selector = new Selector(selectorOpts);
    this.collector = new Collector(options.collector);
    this.renderer = new Renderer(options.renderer);
    this.viteBuilder = new ViteBuilder(options.vite);
  }

  /**
   * 一键生成文档
   */
  async generate(projectPaths: ProjectPath[]): Promise<RenderResult> {
    console.log('🚀 开始生成文档...');
    
    // 1. 收集数据
    const data = await this.collector.collectProjects(projectPaths);
    
    // 2. 保存到缓存
    await this.collector.saveToCache(data);
    
    // 3. 渲染文档
    const result = await this.renderer.render(data);
    
    console.log('✅ 文档生成完成！');
    return result;
  }

  /**
   * 从缓存生成文档
   */
  async generateFromCache(): Promise<RenderResult | null> {
    console.log('📂 从缓存加载数据...');
    
    const data = await this.collector.loadFromCache();
    if (!data) {
      console.log('❌ 没有找到缓存数据');
      return null;
    }
    
    const result = await this.renderer.render(data);
    console.log('✅ 从缓存生成文档完成！');
    return result;
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    await this.selector.clearCache();
    console.log('✅ 缓存已清理');
  }

  /**
   * 生成 Vite 模板
   */
  async generateViteTemplate(): Promise<void> {
    const generator = new ViteTemplateGenerator({
      templateDir: '_VITETEMPLATE',
      projectName: '@mxmweb/docs-vite-template',
      port: 3000
    });
    
    await generator.generateTemplate();
    console.log('✅ Vite 模板生成完成！');
  }

  /**
   * 使用 Vite 生成文档
   */
  async generateWithVite(projectPaths: ProjectPath[]): Promise<void> {
    console.log('🚀 使用 Vite 生成文档...');
    
    // 1. 收集数据
    const data = await this.collector.collectProjects(projectPaths);
    
    // 2. 检查模板是否存在
    const templateExists = await this.viteBuilder.checkTemplate();
    if (!templateExists) {
      console.log('📝 生成 Vite 模板...');
      await this.generateViteTemplate();
    }
    
    // 3. 安装依赖
    await this.viteBuilder.installDependencies();
    
    // 4. 注入文档数据
    await this.viteBuilder.injectDocData(data);
    
    // 5. 构建生产版本
    await this.viteBuilder.buildProduction();
    
    console.log('✅ Vite 文档生成完成！');
  }

  /**
   * 启动 Vite 开发服务器
   */
  async startViteDev(projectPaths: ProjectPath[]): Promise<void> {
    console.log('🚀 启动 Vite 开发服务器...');
    
    // 1. 收集数据
    const data = await this.collector.collectProjects(projectPaths);
    
    // 2. 检查模板是否存在
    const templateExists = await this.viteBuilder.checkTemplate();
    if (!templateExists) {
      console.log('📝 生成 Vite 模板...');
      await this.generateViteTemplate();
    }
    
    // 3. 安装依赖
    await this.viteBuilder.installDependencies();
    
    // 4. 注入文档数据
    await this.viteBuilder.injectDocData(data);
    
    // 5. 启动开发服务器
    await this.viteBuilder.startDevServer();
  }
}
