import { defineConfig } from 'vite';
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
    port: 3000,
    open: true
  },
  define: {
    // 注入文档数据
    __DOC_DATA__: JSON.stringify({
  "projects": [],
  "metadata": {
    "totalProjects": 0,
    "projectsWithDocs": 0,
    "projectsWithAssets": 0,
    "collectionTime": "2026-03-31T09:13:01.262Z"
  },
  "changelog": {
    "generated": true,
    "timestamp": "2026-03-31T09:13:01.261Z",
    "projects": []
  },
  "modules": []
})
  }
});