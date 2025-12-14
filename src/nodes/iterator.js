import { AsyncNode, AsyncFlow } from '../qflow.js';

export class IteratorNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "iterator",
      description: "Iterates items, executes sub-flow for each.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "The list of items to iterate over."
          },
          flow: {
            type: "string",
            description: "The name of the flow to execute for each item, as registered in the flow registry."
          }
        },
        required: ["items", "flow"]
      }
    };
  }

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
