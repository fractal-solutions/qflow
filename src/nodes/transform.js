import { AsyncNode } from '../qflow.js';
import { log } from '../logger.js';

export class TransformNode extends AsyncNode {
  async execAsync() {
    const { input, transformFunction } = this.params;

    if (transformFunction === undefined) {
      throw new Error('TransformNode requires a `transformFunction`.');
    }

    let func;
    try {
      // Create a function from the string. This allows dynamic transformations.
      // Using new Function() is powerful but requires careful handling of scope and security.
      // For this context, we assume the user provides safe functions.
      func = new Function('data', `return (${transformFunction})(data);`);
    } catch (e) {
      throw new Error(`Invalid transformFunction provided: ${e.message}`);
    }

    try {
      const result = func(input);
      log(`[TransformNode] Transformation complete. Result: ${JSON.stringify(result).substring(0, 100)}...`, this.params.logging);
      return result;
    } catch (e) {
      throw new Error(`Error during transformation execution: ${e.message}`);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.transformedData = execRes;
    return 'default';
  }
}
