/// <reference types="tsup" />
/// <reference types="node" />
import { defineConfig } from 'tsup';
import { writeFileSync, chmodSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'src/run-test.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: ['fs', 'path', 'os', 'url', 'stream', 'util', 'events', 'buffer', 'process', 'glob'],
  onSuccess: async () => {
    // 添加 shebang 到 cli.js（tsup 默认不保留 shebang）
    const cliPath = join(process.cwd(), 'dist', 'cli.js');
    try {
      const cliContent = readFileSync(cliPath, 'utf-8');
      if (!cliContent.startsWith('#!')) {
        writeFileSync(cliPath, `#!/usr/bin/env node\n${cliContent}`);
        chmodSync(cliPath, 0o755);
        console.log('✅ 已添加 shebang 到 dist/cli.js');
      }
    } catch {
      // 忽略
    }

    // 生成独立的 package.json 用于 dist 目录
    const distPackageJson = {
      name: "@mxmweb/docs-generator",
      version: "1.2.0",
      type: "module",
      main: "index.js",
      bin: {
        "docs-gen": "./cli.js"
      },
      types: "index.d.ts",
      exports: {
        ".": {
          "import": "./index.js",
          "types": "./index.d.ts"
        }
      },
      // 不在 dist/package.json 中声明 runtime dependencies，
      // 运行时会从项目根 node_modules/ 中解析（external 已处理 glob）
      dependencies: {
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "vite": "^5.4.0",
        "@vitejs/plugin-react": "^4.3.0"
      },
      scripts: {
        start: "node ./run-test.js",
        "docs-gen": "node ./cli.js"
      }
    };
    
    writeFileSync(
      join(process.cwd(), 'dist', 'package.json'),
      JSON.stringify(distPackageJson, null, 2)
    );
    console.log('✅ 已生成 dist/package.json');
  }
});
