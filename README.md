# docs-generator

基于 **Vite + React** 的多项目文档聚合工具。将多个项目的 `README.md` 和入口文件夹内容收集后，渲染成一个统一的文档站点。

---

## 安装

```bash
# 克隆
git clone https://github.com/mxm-web-develop/auto_document.git
cd docs-generator

# 安装依赖（--ignore-scripts 跳过 pandoc 二进制下载，避免 404）
npm install --ignore-scripts

# 链接为全局命令（可选）
npm link
```

> ⚠️ `pandocjs` 的 postinstall 会尝试下载 Pandoc 二进制包，容易 404。用 `--ignore-scripts` 跳过即可，核心功能不依赖它。

---

## 配置

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

| 字段 | 必填 | 说明 |
|---|---|---|
| `projects[].name` | ✅ | 内部标识，不可重复 |
| `projects[].path` | ✅ | 目标项目的**绝对路径** |
| `projects[].title` | ✅ | 导航中显示的名称 |
| `projects[].enabled` | ❌ | 默认 true，设为 false 可跳过 |

---

## 使用

```bash
docs-gen              # 开发服务器（默认端口 3000）
docs-gen build        # 构建生产版本 → _outputs/
docs-gen preview      # 预览已构建的版本
docs-gen --port 8080  # 指定端口
docs-gen --help       # 帮助
```

**不用 `docs-gen` 命令？用 npm script：**

```bash
npm run start    # 等价于 docs-gen
npm run preview  # 等价于 docs-gen preview
npm run build    # 仅 TypeScript 编译 → dist/
```

---

## 工作原理

```
config.json → 读取项目列表
     ↓
Selector → 扫描每个项目的 README.md 和 doc_assets/
     ↓
ViteTemplateGenerator → 运行时生成 _VITETEMPLATE/（首次或缺失时）
     ↓
ViteBuilder → 注入文档数据 → vite build
     ↓
_outputs/ → 最终产物（可部署到任意静态托管）
```

> **`_VITETEMPLATE/` 是运行时自动生成的，勿提交到 git。** 首次运行 `docs-gen` 时会自动创建并安装依赖。

---

## 项目结构

```
docs-generator/
├── config.json                      # ← 你要编辑的配置文件
├── README.md                       # 你在这里
├── src/
│   ├── index.ts                    # API 入口
│   ├── cli.ts                      # CLI 入口
│   ├── run-test.ts                 # 开发调试入口
│   └── core/
│       ├── Selector.ts             # 扫描 README + doc_assets
│       ├── Collector.ts            # 文档数据收集
│       ├── Renderer.ts            # 渲染
│       ├── ViteBuilder.ts         # 构建管理
│       └── ViteTemplateGenerator.ts  # 生成 _VITETEMPLATE/
├── _VITETEMPLATE/                  # 自动生成，勿提交
├── dist/                           # npm run build 产物
└── package.json
```

---

## 常见问题

**Q: `docs-gen` command not found？**
```bash
npm link
# 或直接
node dist/cli.js
```

**Q: `pandocjs` 下载失败（404）？**
```bash
npm install --ignore-scripts
```
Pandoc 二进制不影响核心功能，可安全跳过。

**Q: `_VITETEMPLATE/node_modules` 报错？**
说明 node_modules 不完整。删除整个 `_VITETEMPLATE/` 目录，下次运行 `docs-gen` 会重新生成：
```bash
rm -rf _VITETEMPLATE/
docs-gen
```
