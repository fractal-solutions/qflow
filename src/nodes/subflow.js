import { AsyncNode, AsyncFlow } from '@/qflow.js';

export class SubFlowNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "sub_flow",
      description: "Executes a sub-flow.",
      parameters: {
        type: "object",
        properties: {
          flow: {
            type: "string",
            description: "The name of the flow to execute, as registered in the flow registry."
          },
          shared: {
            type: "object",
            description: "The shared object to pass to the sub-flow."
          }
        },
        required: ["flow"]
      }
    };
  }

  async execAsync() {
    const { flow, shared } = this.params;

    if (!flow || !(flow instanceof AsyncFlow)) {
      throw new Error('SubFlowNode requires an `flow` parameter of type AsyncFlow.');
    }

    const subFlowShared = shared || {};
    const result = await flow.runAsync(subFlowShared);

    return result;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.subFlowResult = execRes;
    return 'default';
  }
}
