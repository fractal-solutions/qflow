import { AsyncNode, AsyncFlow } from '../qflow.js';

export class IteratorNode extends AsyncNode {
  async execAsync() {
    const { items, flow } = this.params;

    if (!items || !Array.isArray(items)) {
      throw new Error('IteratorNode requires an `items` parameter of type Array.');
    }

    if (!flow || !(flow instanceof AsyncFlow)) {
      throw new Error('IteratorNode requires a `flow` parameter of type AsyncFlow.');
    }

    const results = [];
    for (const item of items) {
      const subFlowShared = { item, params: this.params };
      const result = await flow.runAsync(subFlowShared);
      results.push(result);
    }

    return results;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.iteratorResult = execRes;
    return 'default';
  }
}
