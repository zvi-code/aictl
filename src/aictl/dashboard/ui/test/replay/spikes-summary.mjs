import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'node_modules/.cache/aictl-ui-spikes';
const groups = new Map();
for (const folder of await readdir(directory, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const file = join(directory, folder.name, 'spike.json');
  const content = await readFile(file, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (!content) continue;
  const run = JSON.parse(content);
  if (!groups.has(run.kind)) groups.set(run.kind, []);
  groups.get(run.kind).push(run);
}

function distribution(values) {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const count = sorted.length;
  return {
    count,
    min: sorted[0],
    median: (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2,
    p95: sorted[Math.ceil(count * 0.95) - 1],
    max: sorted.at(-1),
  };
}

function eventDurations(run) {
  const interactions = new Map();
  for (const { interactionId, duration } of run.events) {
    interactions.set(interactionId, Math.max(interactions.get(interactionId) ?? 0, duration));
  }
  return [...interactions.values()];
}

function timing(runs) {
  return {
    durationMs: distribution(runs.map(run => run.durationMs)),
    changes: distribution(runs.map(run => run.changes)),
    messageToPaintMs: distribution(runs.flatMap(run => run.messages)),
    inputToPaintMs: distribution(runs.flatMap(run => run.input)),
    eventTimingMs: distribution(runs.flatMap(eventDurations)),
    taskCount: distribution(runs.map(run => run.longTasks.length)),
    tasksOver50ms: distribution(runs.map(run => run.longTasks.filter(task => task.duration > 50).length)),
    taskDurationMs: distribution(runs.flatMap(run => run.longTasks.map(task => task.duration))),
    layoutShiftEntries: distribution(runs.map(run => run.shiftEntries.length)),
    layoutShiftsWithRecentInput: distribution(runs.map(run => run.shiftEntries.filter(entry => entry.hadRecentInput).length)),
    cls: distribution(runs.map(run => run.shifts.cls)),
  };
}

const output = {};
for (const kind of ['solid-1x', 'solid-10x', 'dockview', 'recorded-gallery']) {
  const runs = groups.get(kind) ?? [];
  if (runs.length !== 5 || new Set(runs.map(run => run.run)).size !== 5) {
    throw new Error(`${kind}: expected five distinct repeats, found ${runs.length}.`);
  }
  output[kind] = {
    browser: [...new Set(runs.map(run => run.browserVersion))],
    ...timing(runs),
    dom: distribution(runs.map(run => run.dom.nodes)),
    elements: distribution(runs.map(run => run.dom.elements)),
    rowsInDom: [...new Set(runs.map(run => run.dom.rows.join('/')))],
    heapMiB: {
      first: distribution(runs.map(run => run.heapBytes.first / 2 ** 20)),
      final: distribution(runs.map(run => run.heapBytes.final / 2 ** 20)),
    },
    ...(kind === 'solid-10x' && { domAt500: distribution(runs.map(run => run.domAt500.nodes)) }),
    ...(kind === 'dockview' && {
      drag: timing(runs.map(run => run.drag)),
      resize: timing(runs.map(run => run.resize)),
    }),
  };
}
console.log(JSON.stringify(output, null, 2));
