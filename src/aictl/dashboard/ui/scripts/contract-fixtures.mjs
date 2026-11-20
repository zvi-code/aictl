import { agentDetailFixture, boardFixture } from '../test/fixtures/board.fixture.js';
import { liveCapabilities, liveField } from '../test/fixtures/live.fixture.js';

console.log(JSON.stringify({
  board: boardFixture(),
  agent: agentDetailFixture(),
  capabilities: liveCapabilities,
  entity: liveField('prompts_total', 1),
}));
