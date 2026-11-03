import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Read package.json for build-time constants
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  server: {
    port: 12200
  },
  define: {
    // Inject package.json data as build-time constants
    '__VERSION__': JSON.stringify(pkg.version),
    '__PACKAGE_NAME__': JSON.stringify(pkg.name),
    '__AUTHOR__': JSON.stringify(pkg.author),
    '__LICENSE__': JSON.stringify(pkg.license),
    '__REPOSITORY__': JSON.stringify(pkg.repository.url),
    '__HOMEPAGE__': JSON.stringify(pkg.homepage)
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WebDaterangepicker',  // UMD global name
      formats: ['es', 'umd'],
      fileName: (format) => `web-daterangepicker.${format === 'es' ? 'js' : 'umd.js'}`
    },
    rollupOptions: {
      // Floating UI will be bundled into the component
      external: [],
      output: {
        globals: {}
      }
    }
  }
});
