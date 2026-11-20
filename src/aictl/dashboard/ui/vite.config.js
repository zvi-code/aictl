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

// Dockview 8.9 ships CSS in its browser bundle. Extract it instead of injecting it at runtime.
function dockviewStyles() {
  const id = '/virtual-dockview.css'
  return {
    name: 'dockview-styles',
    resolveId(source) { if (source === id) return id },
    load(source) {
      if (source !== id) return
      const bundle = readFileSync(new URL('./node_modules/dockview-core/dist/dockview-core.js', import.meta.url), 'utf8')
      const css = /cssinject:[^\n]+\n[^]*?s\.textContent = ("(?:\\.|[^"\\])*");/.exec(bundle)?.[1]
      if (!css) throw new Error('Dockview stylesheet not found')
      return JSON.parse(css)
    },
  }
}

// The dashboard uses the unspaced light theme, not Paneview or debug mode.
// Keep Dockview's shared drag, resize, and tab overflow rules.
const dockviewTheme = {
  postcssPlugin: 'dashboard-dockview-theme',
  Once(root) {
    if (!root.source?.input.file?.replaceAll('\\', '/').endsWith('/virtual-dockview.css')) return
    root.walkRules(rule => {
      const selectors = rule.selectors.filter(selector =>
        !/\.(?:dockview-spaced|dv-debug|dv-pane(?:-[\w-]+)?|dv-floating-titlebar)(?![\w-])/.test(selector) &&
        [...selector.matchAll(/\.dockview-theme-[\w-]+/g)].every(([theme]) => theme === '.dockview-theme-light'))
      if (!selectors.length) rule.remove()
      else if (selectors.length !== rule.selectors.length) rule.selectors = selectors
    })
  },
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
        if (process.env.UI_BUNDLE_REPORT === '1') {
          const chunks = Object.values(bundle).filter(entry => entry.type === 'chunk').map(entry => ({
            file: entry.fileName, imports: entry.imports, dynamicImports: entry.dynamicImports,
            modules: Object.fromEntries(Object.entries(entry.modules).map(([id, module]) => [id, module.renderedLength])),
          }))
          this.emitFile({ type: 'asset', fileName: '.vite/bundle-modules.json', source: JSON.stringify(chunks, null, 2) })
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
  plugins: [dockviewStyles(), ...dashboardFrameworks(), staticAssets()],
  css: { postcss: { plugins: [dockviewTheme] } },
  root: '.',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'dockview', test: /[\\/]node_modules[\\/]dockview-core[\\/]/ }] },
      },
    },
  },
})
