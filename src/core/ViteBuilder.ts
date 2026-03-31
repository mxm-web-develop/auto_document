import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface ViteBuildOptions {
  templateDir?: string;
  outputDir?: string;
  port?: number;
  mode?: 'dev' | 'build' | 'preview';
  openBrowser?: boolean;
  host?: string;
  previewDir?: string; // 新增：指定预览目录
}

export class ViteBuilder {
  private options: ViteBuildOptions;

  constructor(options: ViteBuildOptions = {}) {
    this.options = {
      templateDir: '_VITETEMPLATE',
      outputDir: '_outputs',
      port: 3000,
      mode: 'dev',
      openBrowser: true,
      host: 'localhost',
      ...options,
      // 确保 outputDir 有默认值，即使传入 undefined 也不会覆盖
      outputDir: options.outputDir ?? '_outputs',
    };
  }

  /**
   * 安装依赖
   */
  async installDependencies(): Promise<void> {
    console.log('📦 安装 Vite 项目依赖...');
    
    const templateDir = this.options.templateDir!;
    const packageJsonPath = path.join(templateDir, 'package.json');
    
    // 检查 package.json 是否存在
    try {
      await fs.access(packageJsonPath);
    } catch {
      throw new Error(`模板目录不存在或缺少 package.json: ${templateDir}`);
    }

    try {
      execSync('npm install', { 
        cwd: templateDir, 
        stdio: 'inherit' 
      });
      console.log('✅ 依赖安装完成');
    } catch (error) {
      throw new Error(`安装依赖失败: ${(error as Error).message}`);
    }
  }

  /**
   * 注入文档数据到 Vite 项目
   */
  async injectDocData(docData: any): Promise<void> {
    console.log('💉 注入文档数据到 Vite 项目...');
    
    const templateDir = this.options.templateDir!;
    const viteConfigPath = path.join(templateDir, 'vite.config.ts');
    
    try {
      // 读取 vite.config.ts
      let viteConfig = await fs.readFile(viteConfigPath, 'utf-8');
      
      // 替换 __DOC_DATA__ 定义（支持已包含数据的情况）
      const docDataString = JSON.stringify(docData, null, 2);
      
      // 使用更通用的正则表达式匹配和替换
      const regex = /__DOC_DATA__:\s*JSON\.stringify\([^\)]*\)/s;
      if (regex.test(viteConfig)) {
        viteConfig = viteConfig.replace(regex, `__DOC_DATA__: JSON.stringify(${docDataString})`);
      } else {
        // 如果找不到，尝试替换整个 define 对象
        const defineRegex = /define:\s*\{([^}]*__DOC_DATA__:[^}]*)\}/s;
        if (defineRegex.test(viteConfig)) {
          viteConfig = viteConfig.replace(
            defineRegex,
            `define: { $1 __DOC_DATA__: JSON.stringify(${docDataString}), }`
          );
        }
      }
      
      // 写回文件
      await fs.writeFile(viteConfigPath, viteConfig);
      console.log('✅ 文档数据注入完成');
      console.log(`📊 注入的项目数: ${docData.projects?.length || 0}`);
      console.log(`📊 注入的模块数: ${docData.modules?.length || 0}`);
    } catch (error) {
      throw new Error(`注入文档数据失败: ${(error as Error).message}`);
    }
  }

  /**
   * 启动开发服务器
   */
  async startDevServer(): Promise<void> {
    console.log('🚀 启动 Vite 开发服务器...');
    
    const templateDir = this.options.templateDir!;
    const port = this.options.port!;
    const host = this.options.host!;
    const openBrowser = this.options.openBrowser!;
    
    try {
      // 检查端口是否被占用
      await this.checkPortAvailable(port);
      
      // 启动开发服务器
      const { spawn } = await import('child_process');
      const child = spawn('npm', ['run', 'dev'], {
        cwd: templateDir,
        stdio: 'inherit',
        detached: false,
        env: {
          ...process.env,
          VITE_PORT: port.toString(),
          VITE_HOST: host,
          VITE_OPEN: openBrowser.toString()
        }
      });
      
      // 处理进程退出
      child.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ 开发服务器异常退出，退出码: ${code}`);
        }
      });
      
      // 处理错误
      child.on('error', (error) => {
        console.error('❌ 启动开发服务器时出错:', error);
      });
      
      const url = `http://${host}:${port}`;
      console.log(`✅ 开发服务器已启动: ${url}`);
      if (openBrowser) {
        console.log('🌐 正在打开浏览器...');
      }
      console.log('💡 按 Ctrl+C 停止服务器');
      
      // 返回 Promise，让调用者可以等待
      return new Promise((resolve, reject) => {
        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`服务器退出，代码: ${code}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`启动开发服务器失败: ${(error as Error).message}`);
    }
  }

  /**
   * 构建生产版本
   */
  async buildProduction(): Promise<void> {
    console.log('🏗️ 构建生产版本...');
    
    const templateDir = this.options.templateDir!;
    const outputDir = this.options.outputDir!;
    
    try {
      // 构建项目
      execSync('npm run build', {
        cwd: templateDir,
        stdio: 'inherit'
      });
      
      // 复制构建结果到输出目录
      const distDir = path.join(templateDir, 'dist');
      const targetDir = path.join(process.cwd(), outputDir);
      
      // 确保输出目录存在
      await fs.mkdir(targetDir, { recursive: true });
      
      // 复制文件
      await this.copyDirectory(distDir, targetDir);
      
      console.log(`✅ 生产版本构建完成: ${targetDir}`);
    } catch (error) {
      throw new Error(`构建生产版本失败: ${(error as Error).message}`);
    }
  }

  /**
   * 启动预览服务器
   */
  async startPreviewServer(): Promise<void> {
    console.log('👀 启动预览服务器...');
    
    const templateDir = this.options.templateDir!;
    let port = this.options.port!;
    const previewDir = this.options.previewDir;
    
    try {
      // 检查端口是否可用，如果不可用则自动选择可用端口
      try {
        await this.checkPortAvailable(port);
      } catch {
        console.log(`⚠️ 端口 ${port} 已被占用，正在查找可用端口...`);
        port = await this.getAvailablePort(port);
        console.log(`✅ 找到可用端口: ${port}`);
      }
      
      if (previewDir) {
        // 使用 vite 直接预览指定目录（移除 --strictPort 以允许自动选择端口）
        const { spawnSync } = await import('child_process');
        const result = spawnSync('npx', ['vite', 'preview', '--port', String(port), '--base', '/', '--outDir', previewDir], {
          cwd: process.cwd(),
          stdio: 'inherit'
        });
        if (result.status !== 0) {
          throw new Error(`vite preview 失败，退出码: ${result.status}`);
        }
      } else {
        execSync(`npm run preview`, {
          cwd: templateDir,
          stdio: 'inherit',
          env: {
            ...process.env,
            VITE_PORT: String(port)
          }
        });
      }
      
      console.log(`✅ 预览服务器已启动: http://localhost:${port}`);
    } catch (error) {
      throw new Error(`启动预览服务器失败: ${(error as Error).message}`);
    }
  }

  /**
   * 复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * 检查端口是否可用
   */
  private async checkPortAvailable(port: number): Promise<void> {
    const { createServer } = await import('net');
    
    return new Promise((resolve, reject) => {
      const server = createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve();
        });
        server.close();
      });
      
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`端口 ${port} 已被占用，请选择其他端口`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * 检查模板是否存在
   */
  async checkTemplate(): Promise<boolean> {
    const templateDir = this.options.templateDir!;
    const packageJsonPath = path.join(templateDir, 'package.json');
    
    try {
      await fs.access(packageJsonPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用的端口
   */
  async getAvailablePort(startPort: number = 3000): Promise<number> {
    let port = startPort;
    const maxPort = startPort + 100;
    
    while (port <= maxPort) {
      try {
        await this.checkPortAvailable(port);
        return port;
      } catch {
        port++;
      }
    }
    
    throw new Error(`无法找到可用端口，已尝试 ${startPort}-${maxPort}`);
  }
}
