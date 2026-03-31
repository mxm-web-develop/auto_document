/**
 * 快速测试运行脚本
 * 从 config.json 读取项目配置
 * 
 * 用法:
 *   npm run test:run              # 开发模式
 *   npm run test:run build        # 构建模式
 *   npm run test:run preview      # 预览模式
 */
import { runGenerator, ProjectConfig } from './index.js';
import { loadConfig } from './config.js';

/**
 * 快速测试运行
 */
async function main() {
  const mode = (process.argv[2] as 'dev' | 'build' | 'preview') || 'dev';

  // 从 config.json 加载配置
  const config = loadConfig();

  if (config.projects.length === 0) {
    console.log('⚠️  config.json 中没有配置任何项目，请先编辑 config.json 的 projects 数组。');
    console.log('参考 config.json.template 添加项目配置。');
    process.exit(0);
  }

  const projects: ProjectConfig[] = config.projects
    .filter(p => p.enabled !== false)
    .map(p => ({
      absolute_path: p.path,
      title: p.title,
      description: p.description ?? '',
      hasDoc: p.enabled !== false,
      version: p.version || '',
    }));

  console.log('🚀 启动文档生成器（从 config.json 加载）');
  console.log(`📋 模式: ${mode}`);
  console.log('项目:');
  projects.forEach(p => console.log(`  - ${p.title}: ${p.absolute_path}`));
  console.log('');

  if (mode === 'preview') {
    await runGenerator(projects, 'preview', {
      port: config.server?.port ?? 3000,
      entryName: config.entryName,
      previewDir: config.output?.dir ?? '_outputs',
    });
  } else {
    await runGenerator(projects, mode, {
      port: config.server?.port ?? 3000,
      entryName: config.entryName,
    });
  }
}

main().catch((error) => {
  console.error('❌ 执行出错:');
  if (error instanceof Error) {
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
  } else {
    console.error('错误对象:', error);
    console.error('错误类型:', typeof error);
    console.error('错误字符串:', String(error));
  }
  process.exit(1);
});
