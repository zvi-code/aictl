import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

test('the checked-in contract types match the schemas', () => {
  const generator = fileURLToPath(new URL('../../scripts/gen-contract.mjs', import.meta.url));
  execFileSync(process.execPath, [generator, '--check'], { stdio: 'pipe' });
});
