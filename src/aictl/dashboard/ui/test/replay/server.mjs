import { createServer, request } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';

const recordings = fileURLToPath(new URL('../../../../../../test/recordings/', import.meta.url));
const loopback = '127.0.0.1';
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function jsonl(path) {
  return gunzipSync(readFileSync(path)).toString('utf8').trimEnd().split('\n').map(line => JSON.parse(line));
}

function key(url) {
  const params = new URLSearchParams(url.search);
  params.sort();
  return url.pathname + (params.size ? `?${params}` : '');
}

function frame({ id, event, data }) {
  if (event === 'keepalive') return ': recorded keepalive\n\n';
  return `${id ? `id: ${id}\n` : ''}${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
}

function runtimeOnly(entity) {
  return !['history.board', 'catalog.board', 'configuration.board'].includes(entity.topic)
    && !(entity.topic === 'source.status' && entity.id.startsWith('history:'));
}

function recordedScope(url, boardWindow) {
  const params = new URLSearchParams(url.search);
  if (params.getAll('history').length > 1 || !['0', '1'].includes(params.get('history') ?? '1')) return null;
  params.delete('history');
  params.delete('cursor');
  if (!params.size) return '';
  // The main tape recorded its daemon's unfiltered seven-day default without query keys.
  if (!boardWindow || params.size !== 3 || params.get('buckets') !== '14') return null;
  const [since, until] = ['since', 'until'].map(name => Number(params.get(name)));
  if (!Number.isSafeInteger(since) || !Number.isSafeInteger(until) || since <= 0 ||
      until % 43_200 !== 0 || until - since !== 604_800) return null;
  params.sort();
  return params.toString();
}

function scopedData(data, scope) {
  if (!data || !scope) return data;
  const result = { ...data, scope };
  for (const field of ['entities', 'upserts']) {
    if (result[field]) result[field] = result[field].map(entity => entity.data?.scope === data.scope
      ? { ...entity, data: { ...entity.data, scope } } : entity);
  }
  return result;
}

function stream(req, res, events, speed, period, loop, scope) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  const start = performance.now();
  let lap = 0;
  let index = 0;
  let timer;
  const send = () => {
    if (res.destroyed) return;
    if (index === events.length) {
      if (!loop) return; // Hold the final state. Do not have EventSource reconnect at EOF.
      index = 0;
      lap += 1;
    }
    const event = events[index];
    const delay = start + (lap * period + event.offset_ms) / speed - performance.now();
    if (delay > 1) {
      timer = setTimeout(send, delay);
      return;
    }
    index += 1;
    // A new epoch lets clients accept the next bootstrap and its lower sequence.
    let data = scopedData(event.data, scope);
    if (data && lap) {
      const epoch = `${data.epoch}-replay-${lap}`;
      data = { ...data, epoch, cursor: `${epoch}:${data.sequence}` };
    }
    const ready = res.write(lap || scope ? frame({ ...event, data, id: data?.cursor ?? event.id }) : event.wire);
    if (ready) timer = setTimeout(send, 0);
    else res.once('drain', send);
  };
  res.on('close', () => clearTimeout(timer));
  req.socket.setNoDelay(true);
  send();
}

function preferEncoding(header = '') {
  const weights = new Map(header.split(',').map(value => {
    const [encoding, q] = value.trim().toLowerCase().split(';');
    return [encoding, q ? Number(q.trim().replace(/^q=/, '')) : 1];
  }));
  return ['br', 'gzip'].map(name => [name, weights.get(name) ?? weights.get('*') ?? 0])
    .filter(([, weight]) => weight > 0).sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

async function serveFile(req, res, url, root) {
  const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  const within = candidate => {
    const subpath = relative(root, candidate);
    return !isAbsolute(subpath) && subpath !== '..' && !subpath.startsWith(`..${sep}`);
  };
  const file = async name => {
    if (within(name) && within(await realpath(name)) && (await stat(name)).isFile()) return readFile(name);
    return null;
  };
  const find = name => file(name).catch(error => {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  });
  let body = await find(path);
  if (!body) return false;
  const ext = extname(path);
  const headers = { 'Content-Type': mime[ext] ?? 'application/octet-stream',
    'Cache-Control': url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
  if (ext === '.html') {
    // The Python server fills these slots. The tape does not contain its catalog JS.
    body = Buffer.from(body.toString('utf8').replace(/%%(?:TOOL_COLORS_JS|TOOL_ICONS_JS|TAXONOMY_JS)%%/g, ''));
  } else {
    headers.Vary = 'Accept-Encoding';
    for (const encoding of preferEncoding(req.headers['accept-encoding'])) {
      const sidecar = await find(`${path}.${encoding === 'gzip' ? 'gz' : 'br'}`);
      if (!sidecar) continue;
      headers['Content-Encoding'] = encoding;
      body = sidecar;
      break;
    }
  }
  res.writeHead(200, { ...headers, 'Content-Length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}

function proxy(req, res, origin) {
  const forwarded = request(origin, {
    path: req.url, method: req.method, headers: { ...req.headers, host: origin.host },
  }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  forwarded.on('error', error => {
    if (!res.headersSent) res.writeHead(502);
    res.end(`Vite replay upstream: ${error.message}`);
  });
  res.on('close', () => forwarded.destroy());
  req.pipe(forwarded);
}

function proxyUpgrade(req, socket, head, origin) {
  const upstream = request(origin, {
    path: req.url, method: req.method, headers: { ...req.headers, host: origin.host },
  });
  upstream.on('upgrade', (res, peer, firstBytes) => {
    const headers = [];
    for (let index = 0; index < res.rawHeaders.length; index += 2) {
      headers.push(`${res.rawHeaders[index]}: ${res.rawHeaders[index + 1]}`);
    }
    socket.write(`HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n${headers.join('\r\n')}\r\n\r\n`);
    if (head.length) peer.write(head);
    if (firstBytes.length) socket.write(firstBytes);
    peer.on('error', () => socket.destroy());
    peer.on('close', () => socket.destroy());
    socket.on('close', () => peer.destroy());
    socket.pipe(peer).pipe(socket);
  });
  upstream.on('response', response => {
    response.resume();
    socket.end(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\nConnection: close\r\n\r\n`);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  upstream.end();
}

export async function startReplay({
  directory = resolve(recordings, 'busy'), source = 'main', phase = 'start', speed = 1,
  loop = false, dist, vite, port = 0, supplemental = false, boardWindow = false, bootstrapOnly = false,
  onApi = () => {},
  log = message => console.error(message),
} = {}) {
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('Replay speed must be positive.');
  if (!['main', 'isolated'].includes(source) || !['start', 'end'].includes(phase)) {
    throw new Error('Use source main or isolated and phase start or end.');
  }
  if (Boolean(dist) === Boolean(vite)) throw new Error('Set either --dist or --vite.');
  const root = dist && await realpath(dist);
  const origin = vite && new URL(vite);
  if (origin && (origin.protocol !== 'http:' || origin.hostname !== loopback || !origin.port)) {
    throw new Error('Use http://127.0.0.1:<port> for Vite.');
  }
  const file = name => resolve(directory, `${source}-${name}.jsonl.gz`);
  const tape = jsonl(file('sse')).filter(record => record.kind === 'sse' && (!bootstrapOnly || record.event === 'bootstrap'));
  if (tape[0]?.event !== 'bootstrap') throw new Error('The stream tape must start with a bootstrap.');
  const [history, runtime] = [true, false].map(includeHistory => tape.map(record => {
    const data = record.data && { ...record.data };
    if (data && !includeHistory) {
      for (const field of ['entities', 'upserts', 'removals']) {
        if (data[field]) data[field] = data[field].filter(runtimeOnly);
      }
    }
    const event = { ...record, data };
    return { ...event, wire: frame(event) };
  }).filter(event => includeHistory || event.event !== 'change' || event.data.upserts?.length || event.data.removals?.length));
  const metadata = JSON.parse(readFileSync(resolve(directory, 'window.json'), 'utf8'));
  const period = Math.max(metadata.duration_seconds * 1000, tape.at(-1).offset_ms + 1);
  const rest = new Map();
  const add = record => {
    if (!record.capture_error && Number.isInteger(record.status) && Object.hasOwn(record, 'body')) {
      rest.set(key(new URL(record.path, `http://${loopback}`)), record);
    }
  };
  if (supplemental && source === 'main') {
    jsonl(resolve(dirname(resolve(directory)), 'supplemental-main-rest.jsonl.gz')).forEach(add);
  }
  jsonl(file('rest')).filter(record => record.phase === phase).forEach(add);
  const sockets = new Set();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${loopback}`);
      if (url.pathname === '/__replay/ready') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rest: [...rest.keys()], messages: history.length, period }));
        return;
      }
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        const path = key(url);
        const record = req.method === 'GET' ? rest.get(path) : undefined;
        const scope = req.method === 'GET' && url.pathname === '/api/live/stream'
          ? recordedScope(url, boardWindow && source === 'main') : null;
        const live = scope !== null;
        const status = live ? 200 : record?.status ?? 404;
        onApi({ method: req.method, path, status, missing: !live && !record });
        if (live) {
          stream(req, res, url.searchParams.get('history') === '0' ? runtime : history, speed, period, loop, scope);
        } else if (record) {
          const type = record.content_type || 'application/json';
          const body = type === 'text/event-stream' ? (record.body ? frame(record.body) : '')
            : type.includes('json') || typeof record.body !== 'string' ? JSON.stringify(record.body) : record.body;
          res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
          res.end(body);
        } else {
          log(`[replay] 404 unrecorded ${req.method} ${path}`);
          res.writeHead(404, { 'Content-Type': 'application/json', 'X-Replay-Miss': '1' });
          res.end(JSON.stringify({ error: `No recorded response for ${req.method} ${path} (${source}/${phase})` }));
        }
        return;
      }
      if (origin) return proxy(req, res, origin);
      if (['GET', 'HEAD'].includes(req.method) && await serveFile(req, res, url, root)) return;
      log(`[replay] 404 static ${req.method} ${url.pathname}`);
      res.writeHead(404).end('File not found');
    } catch (error) {
      log(`[replay] ${error.message}`);
      if (!res.headersSent) res.writeHead(error instanceof URIError ? 400 : 500);
      res.end('Replay could not serve the request');
    }
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  if (origin) {
    server.on('upgrade', (req, socket, head) => {
      if (req.url.startsWith('/api/')) return socket.destroy();
      proxyUpgrade(req, socket, head, origin);
    });
  }
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, loopback, ok);
  });
  return {
    url: `http://${loopback}:${server.address().port}`,
    close: () => new Promise(ok => {
      server.close(ok);
      for (const socket of sockets) socket.destroy();
    }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    directory: { type: 'string' }, source: { type: 'string' }, phase: { type: 'string' },
    dist: { type: 'string' }, vite: { type: 'string' }, speed: { type: 'string', default: '1' },
    port: { type: 'string', default: '4175' }, loop: { type: 'boolean' }, supplemental: { type: 'boolean' },
    'board-window': { type: 'boolean' },
  } });
  const server = await startReplay({ ...values, boardWindow: values['board-window'],
    speed: Number(values.speed), port: Number(values.port) });
  console.log(`Replay at ${server.url}`);
}
