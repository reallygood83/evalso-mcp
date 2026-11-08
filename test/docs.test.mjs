import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('docs/index.html', root), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const schema = JSON.parse(html.match(/<script type="application\/ld\+json" id="structured-data">([\s\S]*?)<\/script>/)[1]);

test('installation metadata describes the visible guide and published version', () => {
  const graph = schema['@graph'];
  const page = graph.find(item => item['@type'] === 'WebPage');
  const guide = graph.find(item => item['@type'] === 'TechArticle');
  const software = graph.find(item => item['@type'] === 'SoftwareSourceCode');
  assert.equal(page.name, html.match(/<title>(.*?)<\/title>/)[1]);
  assert.equal(page.description, html.match(/name="description" content="([^"]+)"/)[1]);
  assert.equal(guide.headline, html.match(/<h1>(.*?)<\/h1>/)[1]);
  assert.equal(software.version, pkg.version);
  assert.equal(software.license, 'https://github.com/reallygood83/evalso-mcp/blob/main/LICENSE');
  assert.ok(html.includes(`<time datetime="${guide.dateModified}">`));
  assert.match(guide.dateModified, /T\d{2}:\d{2}:\d{2}\+09:00$/);
  assert.ok(html.includes(`>${guide.author.name}</a>`));
  assert.ok(html.includes(`src="${guide.image.split('/evalso-mcp/')[1]}"`));
  for (const section of guide.articleSection) assert.ok(html.includes(`<h2>${section}</h2>`));
  assert.equal(new Set(graph.map(item => item['@id'])).size, graph.length);
  assert.ok(!graph.some(item => ['Review', 'Product', 'SoftwareApplication'].includes(item['@type'])));
  assert.ok(!html.includes('aggregateRating'));
});

test('every client has a pinned npm command and usable tab/copy targets', () => {
  for (const client of ['codex', 'claude', 'hermes']) {
    assert.ok(html.includes(`href="#client-${client}"`));
    assert.ok(html.includes(`id="client-${client}"`));
    const command = html.match(new RegExp(`id="command-${client}">([^<]+)`))[1];
    assert.ok(command.includes(`npx --yes evalso-mcp@${pkg.version}`) || command.includes(`npx --args --yes evalso-mcp@${pkg.version}`));
  }
  assert.ok(html.includes('claude mcp add --scope user'));
  assert.ok(html.includes('--connect-timeout 180'));
  for (const [, id] of html.matchAll(/data-copy="([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`));
  for (const [, asset] of html.matchAll(/(?:src|href)="(assets\/[^"#]+)"/g)) assert.ok(existsSync(new URL(`docs/${asset}`, root)));
});
