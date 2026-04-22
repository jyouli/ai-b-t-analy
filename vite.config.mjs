import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import qiankun from 'vite-plugin-qiankun';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 本地 dev / preview 端口（仅此一处修改） */
const DEV_PORT = 8001;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    base: '/',
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.(js|jsx)$/,
      jsx: 'automatic',
    },
    resolve: {
      alias: {
        src: path.resolve(__dirname, './src'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      /**
       * 部分依赖的 package main 指向未编译的 src/*.ts，生产构建时 Rollup 会按 JS 解析而失败，
       * 对 node_modules 内实际参与打包的 .ts/.tsx 先用 esbuild 转译为 JS（跳过 .d.ts）。
       */
      {
        name: 'transpile-node-modules-typescript',
        enforce: 'pre',
        async transform(code, id) {
          if (!id.includes('node_modules/')) return null;
          if (id.endsWith('.d.ts')) return null;
          const isTs = id.endsWith('.ts') || id.endsWith('.tsx');
          if (!isTs) return null;
          return transformWithEsbuild(code, id, {
            loader: id.endsWith('.tsx') ? 'tsx' : 'ts',
            target: 'es2019',
          });
        },
      },
      {
        name: 'treat-src-js-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!/\/src\/.*\.(js|jsx)$/.test(id)) return null;
          return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
        },
      },
      react(),
      qiankun('ai-b-t-manage', {
        useDevMode: true,
      }),
    ],
    server: {
      port: DEV_PORT,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        '/universe': {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
        },
        '/hecom-tenancy': {
          target: env.VITE_TC_PROXY_TARGET,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    preview: {
      port: DEV_PORT,
      strictPort: true,
    },
    build: {
      target: 'es2019',
      outDir: 'dist',
    },
    define: {
      'process.env.VITE_MODE': JSON.stringify(mode),
    },
  };
});
