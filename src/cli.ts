#!/usr/bin/env node
/**
 * CLI 入口 - docs-gen
 * 
 * 用法:
 *   docs-gen            # 开发模式
 *   docs-gen build      # 构建模式
 *   docs-gen preview    # 预览构建结果
 */
import minimist from 'minimist';
import { runGenerator } from './index.js';
import { loadConfig } from './config.js';

const argv = minimist(process.argv.slice(2), {
  string: ['port', 'config'],
  alias: {
    p: 'port',
    c: 'config',
    h: 'help',
  },
  stopEarly: true,
});

const command = argv._[0] as 'dev' | 'build' | 'preview' | 'help' | undefined;
const port = argv.port ? parseInt(argv.port) : undefined;

// 显示帮助
if (command === 'help' || argv.help) {
  console.log(`
📚 docs-gen — 文档生成器 CLI

用法:
  docs-gen [command] [options]

命令:
  dev       启动开发服务器（默认）
  build     构建生产版本
  preview   预览构建结果

选项:
  --port, -p <端口>  指定端口（默认 3000）
  --config, -c <路径>  指定配置文件路径
  --help, -h         显示帮助信息

示例:
  docs-gen                      # 开发模式，端口 3000
  docs-gen dev --port 8080      # 开发模式，端口 8080
  docs-gen build                # 构建生产版本
  docs-gen preview              # 预览构建结果

配置文件:
  默认读取 ./config.json，可通过 CONFIG_PATH 环境变量或 --config 覆盖。
  参考 config.json.template 创建配置文件。
`);
  process.exit(0);
}

const mode: 'dev' | 'build' | 'preview' = (command as 'dev' | 'build' | 'preview') || 'dev';

// 加载配置（支持自定义路径）
const configPath = argv.config as string | undefined;
const config = loadConfig(configPath);

console.log(`📚 docs-gen v1.2.0`);
console.log(`⚙️  模式: ${mode}`);
console.log(`📋 项目数量: ${config.projects.length}`);
console.log('');

// 将 config.projects 转换为 runGenerator 所需的 ProjectConfig[]
const projects = config.projects.map(p => ({
  absolute_path: p.path,
  title: p.title,
  description: p.description ?? '',
  hasDoc: p.enabled !== false,
  version: p.version || '',
}));

const finalPort = port ?? config.server?.port ?? 3000;

runGenerator(projects, mode, {
  port: finalPort,
  entryName: config.entryName,
}).catch((err) => {
  console.error('❌ 执行出错:', err);
  process.exit(1);
});
