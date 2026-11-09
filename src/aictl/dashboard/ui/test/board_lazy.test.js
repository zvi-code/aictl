// A page open across a new build reloads once when a lazy chunk is gone, and never loops.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { isStaleChunk, loadChunk, reloadForStaleChunk } from '../src/components/board/lazy.js';

const store = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const gone = new TypeError('Failed to fetch dynamically imported module: http://localhost:8484/assets/model-DMJZBHNA.js');

describe('lazy chunks across a new build', () => {
  it('knows the browsers’ messages for a missing chunk, and nothing else', () => {
    expect(isStaleChunk(gone)).toBe(true);
    expect(isStaleChunk(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunk(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isStaleChunk(new Error('HTTP 500'))).toBe(false);
  });

  it('reloads once, then not again within a minute', () => {
    const storage = store();
    const reload = vi.fn();
    expect(reloadForStaleChunk(gone, { now: 1_000_000, storage, reload })).toBe(true);
    expect(reloadForStaleChunk(gone, { now: 1_030_000, storage, reload })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadForStaleChunk(gone, { now: 1_100_000, storage, reload })).toBe(true);
  });

  it('passes any other error on to the caller', async () => {
    await expect(loadChunk(() => Promise.reject(new Error('HTTP 500')))).rejects.toThrow('HTTP 500');
    await expect(loadChunk(() => Promise.resolve({ a: 1 }))).resolves.toEqual({ a: 1 });
  });
});

describe('every lazy import goes through loadChunk', () => {
  it('has no bare import() in the UI source', () => {
    const root = path.resolve(__dirname, '../src');
    const bad = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js')) {
          fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
            if (!/\bimport\(/.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
            // Allowed: wrapped at the call, or an entry of the AGENT_PARTS map that Part wraps.
            if (/loadChunk\(/.test(line) || /^\s*\w+: \(\) => import\('\.\/agent\//.test(line)) return;
            bad.push(path.relative(root, p) + ':' + (i + 1));
          });
        }
      }
    };
    walk(root);
    expect(bad).toEqual([]);
  });
});

describe('the tests load every lazy chunk up front', () => {
  // A chunk first imported inside a test is transformed inside that test's time budget,
  // which times out on a busy machine. test/lazy_chunks.js loads them all at setup.
  it('lists the module of every import() of the UI source in test/lazy_chunks.js', () => {
    const root = path.resolve(__dirname, '../src');
    const targets = new Set();
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js')) {
          for (const m of fs.readFileSync(p, 'utf8').matchAll(/\bimport\(\s*'([^']+)'\s*\)/g)) targets.add(path.resolve(path.dirname(p), m[1]));
        }
      }
    };
    walk(root);
    const setup = path.join(__dirname, 'lazy_chunks.js');
    const loaded = new Set([...fs.readFileSync(setup, 'utf8').matchAll(/^import '([^']+)';/gm)].map(m => path.resolve(__dirname, m[1])));
    expect(targets.size).toBeGreaterThan(10);
    expect([...targets].filter(t => !loaded.has(t)).map(t => path.relative(root, t))).toEqual([]);
  });
});
