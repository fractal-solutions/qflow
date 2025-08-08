import { AsyncNode, AsyncFlow } from '../qflow.js';

export class SubFlowNode extends AsyncNode {
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
