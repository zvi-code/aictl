import { registerHooks } from 'node:module';

import { agentDetailFixture, boardFixture } from '../test/fixtures/board.fixture.js';

// Node runs this harness without Vite's extensionless TypeScript resolver.
const fixture = new URL('../test/fixtures/live.fixture.ts', import.meta.url);
const resolver = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === fixture.href && specifier === '../../src/data/store') {
      return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { liveCapabilities, liveField } = await import(fixture.href).finally(() => resolver.deregister());

console.log(JSON.stringify({
  board: boardFixture(),
  agent: agentDetailFixture(),
  capabilities: liveCapabilities,
  entity: liveField('prompts_total', 1),
}));
