#!/usr/bin/env node
/**
 * Regenerate the reference TABLES in API.md from custom-elements.json — the
 * single source of truth (itself generated from the `static inputs` / `static
 * events` tables by `npm run analyze`). Curated prose in API.md is untouched;
 * only the content between the `<!-- GEN:<section>:start -->` /
 * `<!-- GEN:<section>:end -->` markers is replaced.
 *
 * Sections: `attributes`, `properties`, `methods`, `events`.
 *
 * Usage: `node scripts/gen-api-docs.mjs` (wired into `npm run docs:api`, run by
 * `npm run build` right after `analyze`). Fails loudly if a marker is missing or
 * the manifest has no custom element, so a drift can't pass silently.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'custom-elements.json');
const apiPath = resolve(root, 'API.md');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
let decl;
for (const mod of manifest.modules ?? []) {
  for (const d of mod.declarations ?? []) if (d.customElement) decl = d;
}
if (!decl) {
  console.error('[gen-api-docs] No custom-element declaration found in custom-elements.json');
  process.exit(1);
}

/** Sanitize a value for a single markdown table cell (no newlines, escape pipes). */
const cell = (s) => (s == null ? '' : String(s)).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
/** Wrap in backticks when non-empty, else an em-dash. */
const codeOr = (s, empty = '—') => (s ? '`' + cell(s) + '`' : empty);

// Event-handler props are documented in the Events section — keep them out of Properties.
const HANDLER_PROPS = new Set((decl.events ?? []).map((e) => 'on' + e.name.split(/[-_]/).map((p) => p[0].toUpperCase() + p.slice(1)).join('')));
// Internal configKey aliases whose PUBLIC accessor has a different name.
const PROP_ALIASES = new Set([]); // none — isReadonly IS the public prop (readonly property removed in v2)

function attributesTable() {
  const rows = (decl.attributes ?? []).map((a) =>
    `| \`${cell(a.name)}\` | ${codeOr(a.type?.text, '')} | ${codeOr(a.default)} | ${cell(a.description)} |`,
  );
  return ['| Attribute | Type | Default | Description |', '|-----------|------|---------|-------------|', ...rows].join('\n');
}

function propertiesTable() {
  const fields = (decl.members ?? []).filter(
    (m) =>
      m.kind === 'field' &&
      !m.static &&
      !m.name.startsWith('#') &&
      m.privacy !== 'private' &&
      m.privacy !== 'protected' &&
      !HANDLER_PROPS.has(m.name) &&
      !PROP_ALIASES.has(m.name),
  );
  const rows = fields.map((f) =>
    `| \`${cell(f.name)}\` | ${codeOr(f.type?.text, '')} | ${f.readonly ? 'Read-only' : 'Read/Write'} | ${cell(f.description)} |`,
  );
  return ['| Property | Type | Access | Description |', '|----------|------|--------|-------------|', ...rows].join('\n');
}

function methodsTable() {
  const methods = (decl.members ?? []).filter(
    (m) => m.kind === 'method' && !m.name.startsWith('#') && m.privacy !== 'private' && m.privacy !== 'protected',
  );
  const rows = methods.map((m) => {
    const params = (m.parameters ?? []).map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type?.text ?? 'unknown'}`).join(', ');
    const sig = `(${params}) => ${m.return?.type?.text ?? 'void'}`;
    const depr = m.deprecated ? ' **(deprecated)**' : '';
    return `| \`${cell(m.name)}()\` | \`${cell(sig)}\` | ${cell(m.description)}${depr} |`;
  });
  return ['| Method | Signature | Description |', '|--------|-----------|-------------|', ...rows].join('\n');
}

function eventsTable() {
  const rows = (decl.events ?? []).map((e) => `| \`${cell(e.name)}\` | ${codeOr(e.type?.text, '')} | ${cell(e.description)} |`);
  return ['| Event | Detail Type | Description |', '|-------|-------------|-------------|', ...rows].join('\n');
}

// NOTE: the Events table stays curated in API.md — it carries bubbles/composed
// columns the manifest doesn't model. `eventsTable()` is available if that ever
// changes; it's intentionally not wired into a marker here.
void eventsTable;
const sections = {
  attributes: attributesTable(),
  properties: propertiesTable(),
  methods: methodsTable(),
};

let md = readFileSync(apiPath, 'utf8');
const banner = '<!-- Auto-generated from custom-elements.json — do not edit by hand. Run `npm run docs:api`. -->';
for (const [key, content] of Object.entries(sections)) {
  const start = `<!-- GEN:${key}:start -->`;
  const end = `<!-- GEN:${key}:end -->`;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!re.test(md)) {
    console.error(`[gen-api-docs] Marker ${start} … ${end} not found in API.md`);
    process.exit(1);
  }
  md = md.replace(re, `${start}\n${banner}\n${content}\n${end}`);
}
writeFileSync(apiPath, md);

const counts = {
  attributes: (decl.attributes ?? []).length,
  properties: sections.properties.split('\n').length - 2,
  methods: sections.methods.split('\n').length - 2,
  events: (decl.events ?? []).length,
};
console.log(`[gen-api-docs] Regenerated API.md tables from custom-elements.json:`, counts);
