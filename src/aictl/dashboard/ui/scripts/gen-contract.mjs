import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../contract/', import.meta.url);
const target = new URL('../src/data/contract.gen.ts', import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(file, root), 'utf8'));
const index = read('index.json');
const groups = {
  BoardFields: index.board,
  LiveTopicData: index.topics,
  DetailResponses: index.details,
};
const schemas = new Map(
  [...Object.values(groups), index.shared].flatMap(group => Object.values(group)).sort()
    .map(file => [file, read(file)]),
);
const schemaHash = createHash('sha256').update(JSON.stringify([index, [...schemas]])).digest('hex');
const labels = new Set();
for (const { title } of schemas.values()) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(title) || labels.has(title)) {
    throw new Error(`Invalid or duplicate contract type: ${title}`);
  }
  labels.add(title);
}

const property = key => /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
const indent = depth => '  '.repeat(depth);
const allowed = new Set([
  '$schema', '$id', '$ref', 'title', 'description',
  'type', 'const', 'enum', 'items', 'maxItems', 'minLength', 'minimum', 'properties',
  'required', 'additionalProperties', 'oneOf', 'anyOf', 'allOf',
]);

function render(schema, depth = 0) {
  if (schema === false) return 'never';
  if (schema === true) return 'unknown';
  for (const key of Object.keys(schema)) {
    if (!allowed.has(key)) throw new Error(`Unsupported JSON Schema keyword: ${key}`);
  }
  const parts = [];
  if (schema.$ref) {
    const ref = schemas.get(schema.$ref);
    if (!ref) throw new Error(`Unknown contract reference: ${schema.$ref}`);
    parts.push(ref.title);
  }
  if ('const' in schema) parts.push(JSON.stringify(schema.const));
  if (schema.enum) parts.push(schema.enum.map(value => JSON.stringify(value)).join(' | '));
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (schema[key]) {
      const operator = key === 'allOf' ? ' & ' : ' | ';
      parts.push(schema[key].map(item => render(item, depth)).join(operator));
    }
  }
  if (schema.type) {
    const types = [schema.type].flat().map(type => renderType(type, schema, depth));
    parts.push(types.join(' | '));
  }
  if (!parts.length) throw new Error(`Schema has no TypeScript representation: ${JSON.stringify(schema)}`);
  return parts.length === 1 ? parts[0] : parts.map(part => `(${part})`).join(' & ');
}

function renderType(type, schema, depth) {
  switch (type) {
    case 'integer':
    case 'number': return 'number';
    case 'null':
    case 'boolean':
    case 'string': return type;
    case 'array': return schema.maxItems === 0 ? '[]' : `Array<${render(schema.items ?? true, depth)}>`;
    case 'object': {
      const properties = Object.entries(schema.properties ?? {});
      const fields = properties.map(([key, spec]) =>
        `${indent(depth + 1)}${property(key)}${schema.required?.includes(key) ? '' : '?'}: ${render(spec, depth + 1)};`,
      );
      if (typeof schema.additionalProperties === 'object') {
        const dictionary = `Record<string, ${render(schema.additionalProperties, depth)}>`;
        if (!fields.length) return dictionary;
        throw new Error('Named properties with a typed dictionary are not supported');
      }
      if (!fields.length) return `Record<string, ${schema.additionalProperties === false ? 'never' : 'unknown'}>`;
      return `{\n${fields.join('\n')}\n${indent(depth)}}`;
    }
    default: throw new Error(`Unsupported JSON Schema type: ${type}`);
  }
}

const output = [
  '// Generated from dashboard/contract. Do not edit. Run npm run gen:contract.',
  `// Schema digest: ${schemaHash}`,
  '',
  `export const CONTRACT_VERSION = ${JSON.stringify(index.contract_version)} as const;`,
  '',
  ...[...schemas.values()].flatMap(schema => [`export type ${schema.title} = ${render(schema)};`, '']),
  ...Object.entries(groups).flatMap(([name, group]) => [
    `export interface ${name} {`,
    ...Object.entries(group).map(([key, file]) => `  ${property(key)}: ${schemas.get(file).title};`),
    '}',
    '',
  ]),
].join('\n');

if (process.argv[2] === '--check') {
  if (readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== output) {
    console.error('contract.gen.ts is stale. Run npm run gen:contract.');
    process.exitCode = 1;
  }
} else {
  writeFileSync(target, output);
}
