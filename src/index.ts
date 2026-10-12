#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createRemoteEvalsoServer } from './remote.js';

serveStdio(() => createRemoteEvalsoServer());
