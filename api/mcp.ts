import type { IncomingMessage, ServerResponse } from 'node:http';
import { authorized, remoteHandler } from '../src/remote.js';

export const config = { maxDuration: 300 };

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  const request = new Request(`https://${req.headers.host ?? 'localhost'}/api/mcp`, {
    method: req.method, headers: req.headers as HeadersInit,
    ...(req.method === 'POST' ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}), duplex: 'half' } : {}),
  } as RequestInit);
  if (!process.env.EVALSO_MCP_TOKEN || process.env.EVALSO_MCP_TOKEN.length < 32) {
    res.writeHead(503).end('MCP is not configured');
    return;
  }
  if (!authorized(request)) {
    res.writeHead(401).end('Unauthorized');
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' }).end('Method not allowed');
    return;
  }
  if (Buffer.byteLength(await request.clone().text()) > 65536) {
    res.writeHead(413).end('Request too large');
    return;
  }
  const response = await remoteHandler.fetch(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}
