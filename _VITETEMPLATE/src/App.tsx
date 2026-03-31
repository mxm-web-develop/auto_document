import React from 'react';
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
      href: `#${it.id}`,
      group: it.group,
    }));
  }, [currentModule]);

  // 按需加载 md：从 public 读取
  const loadMd = React.useCallback(async (slug: string) => {
    try {
      console.log('Loading markdown:', slug);
      const res = await fetch(`/${slug}?v=${Date.now()}`);
      if (!res.ok) throw new Error('failed to load: ' + slug);
      const text = await res.text();
      console.log('Loaded markdown, length:', text.length);
      // 仅在内容变化时更新，避免触发子组件 effect 环
      setMarkdown(prev => (prev === text ? prev : text));
      setCurrentSlug(slug);
    } catch (error) {
      console.error('加载文档失败:', error);
      setMarkdown('# 文档加载失败\n\n请检查文档文件是否存在。');
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
      id: `${activeModule}-${activeSidebar || 'index'}`,
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
    const result = `${origin}/${dirPath}`;
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
            key={`${activeModule}-${activeSidebar || 'index'}`}
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

export default App;