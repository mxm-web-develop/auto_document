/**
 * 配置加载与校验模块
 * 从 config.json 读取并使用 zod 校验配置
 */
import { readFileSync } from 'fs';
import { z } from 'zod';

// ============================================================
// Zod Schema 定义
// ============================================================

const ProjectSchema = z.object({
  name: z.string().optional(),
  path: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  version: z.string().optional().default(''),
  enabled: z.boolean().optional().default(true),
});

const OutputSchema = z.object({
  dir: z.string().default('_outputs'),
  cachesDir: z.string().default('_caches'),
});

const ServerSchema = z.object({
  port: z.number().default(3000),
});

const NavSchema = z.object({
  title: z.string().default('文档中心'),
  logo: z.string().optional(),
});

export const ConfigSchema = z.object({
  entryName: z.string().default('doc_asset'),
  projects: z.array(ProjectSchema).default([]),
  output: OutputSchema.default({}),
  server: ServerSchema.default({}),
  nav: NavSchema.default({}),
});

// ============================================================
// 类型导出
// ============================================================

export type Config = z.infer<typeof ConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectSchema>;
export type OutputConfig = z.infer<typeof OutputSchema>;
export type ServerConfig = z.infer<typeof ServerSchema>;
export type NavConfig = z.infer<typeof NavSchema>;

// ============================================================
// 配置加载
// ============================================================

/**
 * 加载配置文件
 * @param configPath 可选，自定义配置文件路径（默认从 CONFIG_PATH 环境变量或 ./config.json）
 * @returns 校验后的配置对象
 * @throws 配置缺失或校验失败时抛出详细错误信息
 */
export function loadConfig(configPath?: string): Config {
  const path = configPath ?? process.env['CONFIG_PATH'] ?? './config.json';

  let rawContent: string;
  try {
    rawContent = readFileSync(path, 'utf-8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      throw new Error(
        `[Config] 配置文件不存在: ${path}\n` +
        `请在项目根目录创建 config.json，或设置 CONFIG_PATH 环境变量指定路径。\n` +
        `参考 config.json.template 创建配置文件。`
      );
    }
    throw new Error(`[Config] 读取配置文件失败 (${path}): ${e.message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    const e = err as Error;
    throw new Error(`[Config] config.json 格式错误，无法解析为 JSON: ${e.message}`);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[Config] config.json 校验失败:\n${issues}\n\n` +
      `请检查配置格式并参考 config.json.template。`
    );
  }

  return result.data;
}

/**
 * 尝试加载配置，失败时返回默认值
 * 适用于非关键场景，避免因配置错误直接退出
 */
export function loadConfigOrDefault(configPath?: string): Config {
  try {
    return loadConfig(configPath);
  } catch (err) {
    console.warn(`[Config] 加载配置失败，使用默认值: ${(err as Error).message}`);
    return ConfigSchema.parse({});
  }
}
