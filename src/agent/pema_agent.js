import { BaseAgent } from './base_agent.js';

/** Plan → Execute → Monitor → Adjust. */
export class PEMAAgent extends BaseAgent {
  static strategyId = 'pema';
}
