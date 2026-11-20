import { agentDetailFixture, boardFixture, fileDetailFixture, machineFixture } from '../test/fixtures/board.fixture.js';
import { liveCapabilities, liveField } from '../test/fixtures/live.fixture.js';

console.log(JSON.stringify({
  board: boardFixture(),
  agent: agentDetailFixture(),
  file: fileDetailFixture(),
  machine: machineFixture(),
  capabilities: liveCapabilities,
  entity: liveField('prompts_total', 1),
}));
