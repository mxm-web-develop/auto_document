import { promises as fs } from 'fs';
import path from 'path';

export interface ViteTemplateOptions {
  templateDir?: string;
  outputDir?: string;
  projectName?: string;
  port?: number;
}

export class ViteTemplateGenerator {
  private options: ViteTemplateOptions;

  constructor(options: ViteTemplateOptions = {}) {
    this.options = {
      templateDir: '_VITETEMPLATE',
      outputDir: '_VITETEMPLATE',
      projectName: '@mxmweb/docs-vite-template',
      port: 3000,
      ...options
    };
  }

  /**
   * 生成 Vite + React 项目模板
   */
  async generateTemplate(): Promise<void> {
    console.log('🎨 开始生成 Vite 模板...');
    
    const templateDir = this.options.templateDir!;
    
    // 确保模板目录存在
    await fs.mkdir(templateDir, { recursive: true });
    await fs.mkdir(path.join(templateDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(templateDir, 'src', 'pages'), { recursive: true });
    await fs.mkdir(path.join(templateDir, 'public'), { recursive: true });

    // 生成 package.json
    await this.generatePackageJson();
    
    // 生成 vite.config.ts
    await this.generateViteConfig();
    
    // 生成 TypeScript 配置
    await this.generateTsConfig();
    
    // 生成 HTML 入口
    await this.generateIndexHtml();
    
    // 生成 React 组件
    await this.generateReactComponents();
    
    console.log('✅ Vite 模板生成完成！');
  }

  /**
   * 生成 package.json
   */
  private async generatePackageJson(): Promise<void> {
    const packageJson = {
      name: this.options.projectName,
      version: "1.0.0",
      type: "module",
      private: true,
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: `vite preview --port ${this.options.port}`
      },
      dependencies: {
        "@mxmweb/rtext": "^1.1.53",
        "@mxmweb/zui": "^1.3.15",
        "@mxmweb/zui-icons": "^1.2.1",
        "@mxmweb/zui-layouts": "^1.3.3",
        "@mxmweb/zui-theme": "^2.1.3",
        "@mxmweb/zui-components": "^1.2.0",
        "@mxmweb/zui-elements": "^1.1.4",
        "react": "^18.0.0",
        "react-dom": "^18.0.0",
        "react-router-dom": "^6.0.0",
        "styled-components": "^6.0.0"
      },
      devDependencies: {
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        "@types/marked": "^5.0.0",
        "@vitejs/plugin-react": "^4.0.0",
        "typescript": "^5.0.0",
        "vite": "^5.0.0"
      }
    };

    await fs.writeFile(
      path.join(this.options.templateDir!, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  /**
   * 生成 vite.config.ts
   */
  private async generateViteConfig(): Promise<void> {
    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: ${this.options.port},
    open: true
  },
  define: {
    // 注入文档数据
    __DOC_DATA__: JSON.stringify({})
  }
});`;

    await fs.writeFile(
      path.join(this.options.templateDir!, 'vite.config.ts'),
      viteConfig
    );
  }

  /**
   * 生成 TypeScript 配置
   */
  private async generateTsConfig(): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ["src"],
      references: [{ "path": "./tsconfig.node.json" }]
    };

    const tsConfigNode = {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true
      },
      include: ["vite.config.ts"]
    };

    await fs.writeFile(
      path.join(this.options.templateDir!, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    await fs.writeFile(
      path.join(this.options.templateDir!, 'tsconfig.node.json'),
      JSON.stringify(tsConfigNode, null, 2)
    );
  }

  /**
   * 生成 index.html
   */
  private async generateIndexHtml(): Promise<void> {
    const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>项目文档</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

    await fs.writeFile(
      path.join(this.options.templateDir!, 'index.html'),
      indexHtml
    );
  }

  /**
   * 生成 React 组件
   */
  private async generateReactComponents(): Promise<void> {
    const templateDir = this.options.templateDir!;

    // main.tsx
    const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    // App.tsx
    const appTsx = `import React from 'react';
import { DocumentContainer } from '@mxmweb/zui-layouts';
import { ThemeProvider } from 'styled-components';
import { defaultTheme } from '@mxmweb/zui-theme';
import { Markdownit } from '@mxmweb/rtext';

// 声明全局变量
declare const __DOC_DATA__: any;

const App: React.FC = () => {
  const docData = __DOC_DATA__ || { projects: [], metadata: {}, modules: [] };

  // 使用预生成的模块数据
  const modules = docData.modules || [];

  // 状态管理
  const [activeModule, setActiveModule] = React.useState(modules[0]?.key || '');
  const [activeSidebar, setActiveSidebar] = React.useState(modules[0]?.items?.[0]?.id);
  const [activeTheme, setActiveTheme] = React.useState('light');
  const [markdown, setMarkdown] = React.useState<string>('');
  const [currentSlug, setCurrentSlug] = React.useState<string>('');

  // 当前模块的侧边栏项目
  const currentModule = modules.find(m => m.key === activeModule);
  const sidebarItems = React.useMemo(() => {
    return (currentModule?.items || []).map(it => ({
      id: it.id,
      label: it.label,
      href: \`#\${it.id}\`,
      group: it.group,
    }));
  }, [currentModule]);

  // 按需加载 md：从 public 读取
  const loadMd = React.useCallback(async (slug: string) => {
    try {
      console.log('Loading markdown:', slug);
      const res = await fetch(\`/\${slug}?v=\${Date.now()}\`);
      if (!res.ok) throw new Error('failed to load: ' + slug);
      const text = await res.text();
      console.log('Loaded markdown, length:', text.length);
      // 仅在内容变化时更新，避免触发子组件 effect 环
      setMarkdown(prev => (prev === text ? prev : text));
      setCurrentSlug(slug);
    } catch (error) {
      console.error('加载文档失败:', error);
      setMarkdown('# 文档加载失败\\n\\n请检查文档文件是否存在。');
    }
  }, []);

  // 切换模块时，加载第一个文档
  React.useEffect(() => {
    const mod = modules.find(m => m.key === activeModule);
    const first = mod?.items?.[0];
    if (first) {
      setActiveSidebar(first.id);
      location.hash = first.id;
      loadMd(first.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

  // 点击侧边项加载对应 md
  const handleSidebarClick = React.useCallback(async (it: { id: string }) => {
    const mod = modules.find(m => m.key === activeModule);
    const found = mod?.items.find(i => i.id === it.id);
    if (found) {
      setActiveSidebar(found.id);
      location.hash = found.id;
      await loadMd(found.slug);
    }
  }, [activeModule, modules]);

  const dataSource = React.useMemo(() => {
    return [{
      id: \`\${activeModule}-\${activeSidebar || 'index'}\`,
      type: 'markdown',
      content: markdown
    }];
  }, [activeModule, activeSidebar, markdown]);

  // Markdown 渲染主题：与容器 light/dark 同步
  const mdTheme = React.useMemo(() => (
    activeTheme === 'dark'
      ? {
          primaryColor: '#60a5fa',
          secondaryColor: '#93c5fd',
          backgroundColor: '#0f172a',
          textColor: '#e5e7eb',
          borderColor: '#1f2937',
          disabledBackground: '#1f2937',
          hoverBackground: '#374151',
          borderRadius: '8px',
          padding: '12px',
          scrollbarTrack: '#0b1220',
          scrollbarThumb: '#1f2937',
          scrollbarThumbHover: '#374151'
        }
      : {
          primaryColor: '#3b82f6',
          secondaryColor: '#60a5fa',
          backgroundColor: '#ffffff',
          textColor: '#24292f',
          borderColor: '#e5e7eb',
          disabledBackground: '#f8f9fa',
          hoverBackground: '#f3f4f6',
          borderRadius: '8px',
          padding: '12px',
          scrollbarTrack: '#f3f4f6',
          scrollbarThumb: '#d1d5db',
          scrollbarThumbHover: '#9ca3af'
        }
  ), [activeTheme]);

  // 计算 basePath：动态获取当前 host
  const basePath = React.useMemo(() => {
    const origin = window.location.origin;
    
    if (!currentSlug) return origin + '/';
    
    // 从 slug 中提取目录路径
    const dirPath = currentSlug.substring(0, currentSlug.lastIndexOf('/'));
    const result = \`\${origin}/\${dirPath}\`;
    console.log('📂 basePath:', { origin, currentSlug, dirPath, result });
    return result;
  }, [currentSlug]);

  return (
    <ThemeProvider theme={defaultTheme}>
      <DocumentContainer
        headerLogo={<div style={{ fontWeight: 700 }}>项目文档</div>}
        modules={modules}
        activeModuleKey={activeModule}
        onModuleChange={setActiveModule}
        languages={[{ key: 'zh', label: '中文' }]}
        activeLanguageKey="zh"
        onLanguageChange={() => {}}
        themes={[{ key: 'light', label: '浅色' }, { key: 'dark', label: '深色' }]}
        activeThemeKey={activeTheme}
        onThemeChange={setActiveTheme}
        sidebarItems={sidebarItems}
        activeSidebarId={activeSidebar}
        onSidebarItemClick={handleSidebarClick as any}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {(() => {
            console.log('🚀 Markdownit props:', {
              dataSourceLength: dataSource.length,
              basePath,
              hasImages: markdown.includes('!['),
              markdownLength: markdown.length
            });
            return null;
          })()}
          <Markdownit
            key={\`\${activeModule}-\${activeSidebar || 'index'}\`}
            dataSource={dataSource}
            enableVirtualScroll={false}
            size="sm"
            basePath={basePath}
            theme={mdTheme}
          />
        </div>
      </DocumentContainer>
    </ThemeProvider>
  );
};

export default App;`;

    // index.css
    const indexCss = `/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

/* 确保 DocumentContainer 占满全屏 */
#root {
  min-height: 100vh;
  width: 100%;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }
}

/* 自定义样式可以在这里添加 */
.document-container {
  min-height: 100vh;
}

/* 加载状态样式 */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误状态样式 */
.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: #dc2626;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .document-container {
    padding: 0 0.5rem;
  }
}`;

    // 写入文件
    await fs.writeFile(path.join(templateDir, 'src', 'main.tsx'), mainTsx);
    await fs.writeFile(path.join(templateDir, 'src', 'App.tsx'), appTsx);
    await fs.writeFile(path.join(templateDir, 'src', 'index.css'), indexCss);
  }
}
