#!/usr/bin/env bun
import { QFlowMCPServer } from './server.js';

await new QFlowMCPServer().start();
