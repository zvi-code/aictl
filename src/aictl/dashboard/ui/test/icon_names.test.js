// Every icon name a component asks for must exist, or the panel title shows the name as text.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../src');

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

describe('icon names', () => {
  it('every icon="name" in a component is defined in Icon.js', () => {
    const icons = readFileSync(join(ROOT, 'components/ui/Icon.js'), 'utf-8');
    const missing = [];
    for (const file of sources(ROOT)) {
      for (const match of readFileSync(file, 'utf-8').matchAll(/icon="([a-z0-9-]+)"/g)) {
        if (!icons.includes(`'${match[1]}':`)) missing.push(`${match[1]} in ${file}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
