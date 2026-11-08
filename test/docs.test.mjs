import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('docs/index.html', root), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const schema = JSON.parse(html.match(/<script type="application\/ld\+json" id="structured-data">([\s\S]*?)<\/script>/)[1]);

test('public lookup FAQs match JSON-LD exactly and describe actual limits', () => {
  const faq = schema['@graph'].find(item => item['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 3);
  const details = [...html.matchAll(/<details id="faq-[^"]+"><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)];
  for (const question of faq.mainEntity) {
    const visible = details.find(([, heading]) => heading === question.name);
    assert.ok(visible, question.name);
    assert.equal(question.acceptedAnswer.text, visible[2]);
  }
  const answers = faq.mainEntity.map(q => q.acceptedAnswer.text).join('\n');
  for (const fact of ['Open API 인증키', '공개 웹사이트', '접속 제한', '사이트 구조 변경', '8,000자', '12,000자', '16건·30분', '학교·목록 재조회']) assert.ok(answers.includes(fact));
  const guide = schema['@graph'].find(item => item['@type'] === 'TechArticle');
  assert.equal(guide.hasPart['@id'], faq['@id']);
});

test('creator channels use the verified profiles, local logos and safe new tabs', () => {
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
  const links = [
    ['https://x.com/reallygood83', 'x'],
    ['https://www.threads.com/@learning.masters', 'threads'],
    ['https://www.youtube.com/@%EB%B0%B0%EC%9B%80%EC%9D%98%EB%8B%AC%EC%9D%B8-p5v', 'youtube'],
  ];
  for (const [url, logo] of links) {
    assert.ok(footer.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`));
    assert.ok(footer.includes(`src="assets/${logo}-logo.svg"`));
    assert.ok(existsSync(new URL(`docs/assets/${logo}-logo.svg`, root)));
  }
});

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
  assert.ok(html.includes(`src="${new URL(guide.image).pathname.slice(1)}"`));
  for (const section of guide.articleSection) assert.ok(html.includes(`<h2>${section}</h2>`));
  assert.equal(new Set(graph.map(item => item['@id'])).size, graph.length);
  assert.ok(!graph.some(item => ['Review', 'Product', 'SoftwareApplication'].includes(item['@type'])));
  assert.ok(!html.includes('aggregateRating'));
});

test('Vercel canonical, social metadata and sitemap use the production origin', () => {
  const origin = 'https://evalso-mcp-guide.vercel.app/';
  assert.ok(html.includes(`<link rel="canonical" href="${origin}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${origin}">`));
  assert.ok(!html.includes('reallygood83.github.io/evalso-mcp'));
  for (const item of schema['@graph']) assert.ok(item['@id'].startsWith(origin));
  assert.ok(readFileSync(new URL('docs/sitemap.xml', root), 'utf8').includes(`<loc>${origin}</loc>`));
  assert.ok(readFileSync(new URL('docs/robots.txt', root), 'utf8').includes(`${origin}sitemap.xml`));
  const config = JSON.parse(readFileSync(new URL('docs/vercel.json', root), 'utf8'));
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, '.');
  assert.equal(config.installCommand, '');
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
