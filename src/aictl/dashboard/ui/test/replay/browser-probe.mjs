// Keep this function self-contained. Playwright runs it in the page before app code.
export function installProbe({ measureBoard = false, statFrames = {}, shiftSources = false } = {}) {
  const entries = { longtask: [], 'layout-shift': [], event: [] };
  const observers = [];
  function describeSource({ node, previousRect, currentRect }) {
    const element = node instanceof Element ? node : node?.parentElement;
    return {
      node: element ? {
        type: node.nodeName,
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        classes: [...element.classList],
        table: element.closest('table')?.getAttribute('aria-label') ?? null,
        row: element.closest('[aria-rowindex]')?.getAttribute('aria-rowindex') ?? null,
        column: 'cellIndex' in element ? element.cellIndex + 1 : null,
        panel: element.closest('section')?.getAttribute('aria-labelledby') ?? null,
        text: node.textContent?.trim().slice(0, 100),
      } : null,
      previousRect: previousRect.toJSON(),
      currentRect: currentRect.toJSON(),
    };
  }
  for (const type of Object.keys(entries)) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
    const record = list => {
      for (const entry of list) {
        const { startTime, duration, value, hadRecentInput, name, interactionId } = entry;
        const sources = shiftSources && type === 'layout-shift' ? entry.sources.map(describeSource) : undefined;
        entries[type].push({ startTime, duration, value, hadRecentInput, name, interactionId, ...(sources && { sources }) });
      }
    };
    const observer = new PerformanceObserver(list => record(list.getEntries()));
    observer.observe({ type, buffered: true, ...(type === 'event' ? { durationThreshold: 16 } : {}) });
    observers.push([observer, record]);
  }
  const afterFrame = callback => requestAnimationFrame(() => requestAnimationFrame(() => callback(performance.now())));
  const result = {
    firstBoardPaint: null, messages: { eligible: 0, superseded: 0, samples: [] },
    interactions: [], bootstraps: 0, changes: 0,
    snapshot() {
      for (const [observer, record] of observers) record(observer.takeRecords());
      const assets = performance.getEntriesByType('resource').filter(entry => /\.(js|css)$/.test(new URL(entry.name).pathname))
        .map(({ name, transferSize, encodedBodySize, decodedBodySize, responseEnd }) => ({
          path: new URL(name).pathname, transferSize, encodedBodySize, decodedBodySize, responseEnd,
        }));
      return {
        entries, supported: PerformanceObserver.supportedEntryTypes, assets,
        firstBoardPaint: result.firstBoardPaint,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        endMs: performance.now(), messages: result.messages, interactions: result.interactions,
        bootstraps: result.bootstraps, changes: result.changes,
        overflow: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0),
        domElements: document.getElementsByTagName('*').length,
      };
    },
  };
  window.__replayProbe = result;
  if (!measureBoard) return;

  const board = new MutationObserver(() => {
    const message = document.querySelector('#sec-top a:nth-of-type(2) .bd-v')?.textContent;
    if (!message || message === 'n/a') return;
    board.disconnect();
    afterFrame(now => {
      result.firstBoardPaint = now;
      performance.mark('aictl-first-board-paint');
    });
  });
  board.observe(document, { subtree: true, childList: true, characterData: true });

  const stats = '#p-daemon .bd-stats';
  let pending;
  let lastExpected;
  const matches = (element, expected) => {
    const values = element?.querySelectorAll('.bd-v');
    return expected.every((value, index) => values?.[index]?.textContent === value);
  };
  const visible = node => {
    if (!node?.isConnected || document.visibilityState !== 'visible') return false;
    const { left, top, right, bottom } = node.getBoundingClientRect();
    return right > 0 && bottom > 0 && left < innerWidth && top < innerHeight;
  };
  const changed = () => {
    if (!pending || pending.frame) return;
    pending.frame = true;
    requestAnimationFrame(() => {
      if (!pending) return;
      const next = pending;
      next.frame = false;
      const element = document.querySelector(stats);
      if (!matches(element, next.expected) || !visible(element)) return;
      pending = null;
      requestAnimationFrame(() => result.messages.samples.push({ startTime: next.arrived,
        duration: performance.now() - next.arrived }));
    });
  };
  result.trackStats = () => {
    const panel = document.querySelector('#p-daemon');
    if (!panel) throw new Error('Daemon panel not found');
    result.trackingStats = true;
    new MutationObserver(changed).observe(panel, {
      subtree: true, characterData: true, childList: true,
    });
    performance.mark('aictl-replay-start');
  };
  const EventSourceClass = window.EventSource;
  window.EventSource = class extends EventSourceClass {
    constructor(url, options) {
      super(url, options);
      if (new URL(url, location.href).pathname !== '/api/live/stream') return;
      this.addEventListener('bootstrap', () => { result.bootstraps += 1; });
      this.addEventListener('change', event => {
        const arrived = performance.now();
        result.changes += 1;
        if (!result.trackingStats) return;
        const sequence = event.lastEventId.split(':').at(-1);
        const expected = statFrames[sequence];
        if (!expected) return;
        if (lastExpected?.every((value, index) => value === expected[index])) return;
        lastExpected = expected;
        if (pending) {
          result.messages.superseded += 1;
          pending = null;
        }
        if (matches(document.querySelector(stats), expected)) return;
        result.messages.eligible += 1;
        pending = { arrived, expected };
      });
    }
  };
  result.armPalette = () => {
    addEventListener('keydown', function opened(event) {
      if (!event.ctrlKey || event.key.toLowerCase() !== 'k') return;
      removeEventListener('keydown', opened, true);
      const startTime = event.timeStamp;
      const observer = new MutationObserver(() => {
        const dialog = document.querySelector('[aria-label="Command palette"][role="dialog"]');
        if (!dialog) return;
        observer.disconnect();
        afterFrame(now => {
          if (visible(dialog)) result.interactions.push({ startTime, duration: now - startTime });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }, true);
  };
}

// Use the largest session window. Do not count shifts just after input.
export function layoutShift(entries, startTime, endTime = Infinity) {
  const shifts = entries.filter(entry => !entry.hadRecentInput && entry.value &&
    entry.startTime >= startTime && entry.startTime < endTime).sort((a, b) => a.startTime - b.startTime);
  let cls = 0;
  let score = 0;
  let first = -Infinity;
  let previous = -Infinity;
  for (const { startTime: time, value } of shifts) {
    if (time - first >= 5000 || time - previous >= 1000) {
      first = time;
      score = 0;
    }
    previous = time;
    score += value;
    cls = Math.max(cls, score);
  }
  return { cls, count: shifts.length, sum: shifts.reduce((total, entry) => total + entry.value, 0) };
}
