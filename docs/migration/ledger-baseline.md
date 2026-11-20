# Phase 0 line and bundle baseline

## Lines at `2cf86cf`

Commands from the repository root:

```powershell
git rev-parse --short HEAD
node scripts\ledger.mjs --snapshot
```

| Category | Lines |
|---|---:|
| UI source | 15,880 |
| CSS | 1,446 |
| UI tests | 9,006 |
| Backend | 111,166 |
| Backend tests | 62,793 |
| **Code total** | **200,291** |
| Docs | 40,513 |
| Other | 1,863 |

The snapshot reads committed files, not the working tree. It excludes 22 files
under `src/aictl/dashboard/dist/`. Blank lines count. A final line counts even
without a newline. A file with a null byte in its first 8,000 bytes counts as
binary and contributes no lines.

To repeat this measurement, run `node scripts\ledger.mjs --snapshot 2cf86cf`.
For a PR, use `node scripts\ledger.mjs --require-negative <base-ref> <head-ref>`.
A move counts as a deletion at the old path and an addition at the new path.
Only the five code categories affect the exit code. A positive net fails. A zero
net passes the command but does not meet the cutover rule to delete more than
the phase adds. Add `--json` to get the totals and the list of excluded files.

## Production UI bundle

| Scope | Asset | Files | Raw bytes | Gzip bytes | Brotli bytes |
|---|---|---:|---:|---:|---:|
| Initial load | JS | 1 | 344,806 | 119,701 | 102,353 |
| Initial load | CSS | 1 | 73,099 | 13,227 | 11,635 |
| All output | JS | 17 | 666,144 | 228,805 | 199,154 |
| All output | CSS | 4 | 112,792 | 21,084 | 18,466 |

Vite 5.4.21 built the UI with Node v26.13.0. From `src/aictl/dashboard/ui`,
the build used a new output directory under the repository's `build/` directory:

```powershell
$out = Join-Path (git rev-parse --show-toplevel) "build\ledger-$([guid]::NewGuid().ToString('N'))"
npx --no-install vite build --outDir $out --emptyOutDir --manifest --logLevel warn
```

For the bundle budget, use **Initial load**. It includes the JS and CSS for
`index.html` and its static imports in the Vite manifest. **All output** also
includes files loaded by dynamic imports. Each file was compressed separately
with `node:zlib` (`gzipSync` and `brotliCompressSync`, default options). Each
row is the sum of the file sizes in bytes, without HTTP headers. The build did
not write to the tracked `dist` directory.
