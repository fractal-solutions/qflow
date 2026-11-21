import { AgentEngine } from './engine.js';

/**
 * Shared base for the named reasoning agents. New patterns should subclass
 * this and set `strategyId` (or pass `strategy` in the options constructor).
 */
export class BaseAgent extends AgentEngine {
  static strategyId = 'default';
}

export { AgentEngine };
