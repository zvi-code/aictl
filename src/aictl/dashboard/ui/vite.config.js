import { readFileSync } from 'node:fs'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
// The npm alias selects an upstream @solidjs/vite-plugin release that supports Solid 2.0 RC.21.
import solid from 'vite-plugin-solid'

export function dashboardFrameworks() {
  return [
    preact({ include: /\.js$/ }),
    solid({ include: /\.tsx$/ }),
  ]
}

function staticAssets() {
  return {
    name: 'dashboard-static-assets',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const [fileName, entry] of Object.entries(bundle)) {
          if (!/\.(?:js|css)$/.test(fileName)) continue
          const bytes = Buffer.from(entry.type === 'chunk' ? entry.code : entry.source)
          this.emitFile({ type: 'asset', fileName: `${fileName}.br`, source: brotliCompressSync(bytes) })
          this.emitFile({ type: 'asset', fileName: `${fileName}.gz`, source: gzipSync(bytes) })
        }
        for (const name of ['inter', 'jetbrains-mono']) {
          const fileName = `${name}-OFL.txt`
          const source = readFileSync(new URL(`./src/assets/fonts/${fileName}`, import.meta.url))
          this.emitFile({ type: 'asset', fileName: `assets/${fileName}`, source })
        }
      },
    },
  }
}

export default defineConfig({
  plugins: [...dashboardFrameworks(), staticAssets()],
  root: '.',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
