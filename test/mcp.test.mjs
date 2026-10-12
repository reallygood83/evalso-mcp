import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, InMemoryTransport, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createServer } from 'node:http';
import { authorized, createRemoteEvalsoServer, createRemoteHandler } from '../dist/remote.js';

const school = { id: '1', shlIdfCd: '1', name: '평촌초등학교', sido: '경기', sgg: '안양', kind: '초등학교' };
const plan = { text: '<td>[6국01-03] 글의 내용을 이해한다.</td>', needsOcr: false,
  source: { type: 'schoolinfo', schoolName: school.name, year: 2026, fileSeq: '0' } };
const documents = [{ id: '0', seq: '0', filename: '6학년 평가계획.pdf', title: '평가계획', extension: 'pdf' }];
const data = () => {
  const cache = new Map();
  const calls = [];
  return {
    calls,
    deps: {
      searchSchoolsByName: async () => [school],
      listEvaluationDocuments: async (_school, year) => ({ documents, year, downloadParams: {} }),
      fetchEvaluationPlanText: async ({ semester }) => { calls.push(semester); return { ...plan, source: { ...plan.source, semester } }; },
      getText: async (key) => cache.get(key),
      putText: async (key, value) => { cache.set(key, value); },
    },
  };
};
const decoded = async (client, name, args) => {
  const response = await client.callTool({ name, arguments: args });
  assert.equal(response.content?.[0]?.type, 'text');
  return { value: JSON.parse(response.content[0].text), isError: response.isError };
};

test('설치형 Node stdio 실행 파일에서 MCP 도구 네 개가 보인다', async () => {
  const client = new Client({ name: 'install-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['dist/index.js'], cwd: process.cwd() }));
  try {
    const tools = (await client.listTools()).tools;
    assert.deepEqual(tools.map((tool) => tool.name),
      ['find_school', 'list_plan_documents', 'read_plan_text', 'prepare_comment_guidance']);
    assert.match(client.getInstructions() ?? '', /학교알리미.*평가계획/);
    assert.match(client.getInstructions() ?? '', /find_school.*list_plan_documents.*read_plan_text.*prepare_comment_guidance/s);
    assert.ok(tools.every((tool, index) => tool.description?.includes(`${index + 1}/4`)));
    assert.match(tools[3].description, /문장을 생성하지 않습니다/);
  } finally { await client.close(); }
});

test('학기 캐시를 분리하고 원문에 없는 기준을 거부한다', async () => {
  const { deps, calls } = data();
  const server = createRemoteEvalsoServer(deps);
  const client = new Client({ name: 'guide-test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  await client.connect(a);
  try {
    const args = { schoolName: school.name, year: 2026, fileSeq: '0' };
    assert.equal((await decoded(client, 'read_plan_text', { ...args, semester: 1 })).value.status, 'ready');
    assert.equal((await decoded(client, 'read_plan_text', { ...args, semester: 2 })).value.status, 'ready');
    assert.deepEqual(calls, [1, 2]);
    const bad = await decoded(client, 'prepare_comment_guidance', { ...args, semester: 1, subject: '국어',
      standards: [{ id: '[6국01-03]', text: '지어낸 기준', achievementLevel: '상' }] });
    assert.equal(bad.isError, true);
    const good = await decoded(client, 'prepare_comment_guidance', { ...args, semester: 1, subject: '국어',
      standards: [{ id: '[6국01-03]', text: '글의 내용을 이해한다.', achievementLevel: '중' }] });
    assert.equal(good.value.status, 'ready');
    assert.match(good.value.system, /입력에 없는/);
    assert.deepEqual(calls, [1, 2]);
  } finally { await client.close(); await server.close(); }
});

test('HTTP MCP 연결과 운영자 토큰 검증', async () => {
  const { deps } = data();
  const handler = createRemoteHandler(deps);
  const token = 't'.repeat(40);
  assert.equal(authorized(new Request('https://example.org/api/mcp'), token), false);
  assert.equal(authorized(new Request('https://example.org/api/mcp', {
    headers: { authorization: `Bearer ${token}`, origin: 'https://other.org' },
  }), token), false);
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers,
      body: req.method === 'POST' ? Buffer.concat(chunks) : undefined, duplex: 'half' });
    const response = await handler.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'http-test', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${http.address().port}/api/mcp`)));
    assert.equal((await decoded(client, 'find_school', { query: '평촌초' })).value.schools[0].sgg, '안양');
  } finally {
    await client.close();
    await handler.close();
    await new Promise((resolve) => http.close(resolve));
  }
});
