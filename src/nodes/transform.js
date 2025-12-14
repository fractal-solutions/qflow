import { AsyncNode } from '@/qflow.js';
import { log } from '@/logger.js';

export class TransformNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "transform_node",
      description: "Transforms data using a JavaScript function.",
      parameters: {
        type: "object",
        properties: {
          input: {
            type: "object", // Can be any type of data
            description: "The data to be transformed."
          },
          transformFunction: {
            type: "string",
            description: "A JavaScript function string (e.g., '(data) => data.map(item => item.name)') that takes 'data' as an argument and returns the transformed result."
          }
        },
        required: ["input", "transformFunction"]
      }
    };
  }

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
