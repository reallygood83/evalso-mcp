#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createRemoteEvalsoServer } from './remote.js';
const stderrLog = (...args) => console.error(...args);
console.log = console.info = console.debug = stderrLog;
serveStdio(() => createRemoteEvalsoServer());
