# docs-generator

基于 **Vite + React** 的多项目文档聚合工具。将多个项目的 `README.md` 和入口文件夹内容收集后，渲染成一个统一的文档站点。

---

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/mxm-web-develop/auto_document.git
cd auto_document

# 2. 安装依赖
npm install

#  3. 编辑配置：填入你要聚合的项目路径
# 参考下方「config.json 完整字段」章节

# 4. 启动文档站
docs-gen
```

> 如果 `docs-gen` 命令不可用，请使用：
> ```bash
> npm run docs-gen
> ```

---

## 命令

| 命令 | 说明 |
|---|---|
| `docs-gen` | 启动开发服务器（默认端口 3000） |
| `docs-gen build` | 构建生产版本，输出到 `_outputs/` |
| `docs-gen preview` | 预览已构建的文档站 |
| `docs-gen --port 8080` | 指定端口 |
| `docs-gen --help` | 显示帮助信息 |

也可通过 npm scripts 调用：

```bash
npm run start      # 等价于 docs-gen（使用 config.json 配置）
npm run preview    # 等价于 docs-gen preview
npm run test:run   # 运行脚本（开发调试用）
```

---

## config.json

在项目根目录创建 `config.json`：

```json
{
  "entryName": "doc_asset",
  "projects": [
    {
      "name": "my-project",
      "path": "/absolute/path/to/my-project",
      "title": "我的项目",
      "description": "项目描述",
      "version": "1.0.0",
      "enabled": true
    }
  ],
  "output": {
    "dir": "_outputs",
    "cachesDir": "_caches"
  },
  "server": {
    "port": 3000
  },
  "nav": {
    "title": "文档中心"
  }
}
```

### 完整字段说明

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `entryName` | `string` | `"doc_asset"` | 入口文件夹名称（可自定义，如 `"docs"`） |
| `projects` | `Project[]` | `[]` | 要聚合的项目列表 |
| `projects[].name` | `string` | — | 项目内部标识（不可重复） |
| `projects[].path` | `string` | — | 项目**绝对路径** |
| `projects[].title` | `string` | — | 导航中显示的名称 |
| `projects[].description` | `string` | `""` | 项目描述 |
| `projects[].version` | `string` | `""` | 版本号 |
| `projects[].enabled` | `boolean` | `true` | 是否启用 |
| `output.dir` | `string` | `"_outputs"` | 构建输出目录 |
| `output.cachesDir` | `string` | `"_caches"` | 缓存目录 |
| `server.port` | `number` | `3000` | 开发服务器端口 |
| `nav.title` | `string` | `"文档中心"` | 站点标题 |

---

## 项目结构

```
docs-generator/
├── config.json              # 配置文件（用户编辑）
├── src/
│   ├── index.ts            # API 入口（runGenerator）
│   ├── config.ts           # 配置加载 + Zod 校验
│   ├── cli.ts              # CLI 入口
│   ├── run-test.ts         # 开发调试入口
│   └── core/               # 核心模块
│       ├── Selector.ts     # 入口文件夹识别（entryName 参数化）
│       ├── Collector.ts    # 文档数据收集
│       ├── Renderer.ts     # 文档渲染
│       ├── ViteBuilder.ts  # Vite 模板管理
│       └── ViteTemplateGenerator.ts
├── _VITETEMPLATE/          # Vite 模板（运行时生成）
├── dist/                   # 编译产物
└── package.json
```

---

## 开发

```bash
# 构建（TypeScript → dist/）
npm run build

# 开发模式（监听文件变化，自动重载）
npm run dev

# 直接运行调试脚本（使用 config.json）
npm run test:run
```

---

## API 使用

```typescript
import { runGenerator } from '@mxmweb/docs-generator';

await runGenerator([
  {
    absolute_path: '/path/to/project',
    title: '我的项目',
    description: '项目描述',
  }
], 'dev', { port: 3000, entryName: 'doc_asset' });
```
