import { AsyncNode } from '../qflow.js';
import { promises as fs } from 'fs';
import Ajv from 'ajv'; // npm install ajv
import addFormats from 'ajv-formats'; // npm install ajv-formats

export class DataValidationNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "data_validation",
      description: "Validates structured data against a JSON Schema.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "object", // Can be any JSON-compatible type
            description: "The data to be validated."
          },
          schema: {
            type: "object",
            description: "The JSON Schema object directly."
          },
          schemaPath: {
            type: "string",
            description: "Optional. Path to a JSON Schema file. If provided, 'schema' parameter is ignored."
          },
          action: {
            type: "string",
            enum: ["validate"],
            description: "The action to perform. Currently only 'validate' is supported."
          }
        },
        required: ["data"]
      }
    };
  }

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
    this.ajv = new Ajv({ allErrors: true, verbose: true }); // Configure AJV for detailed errors
    addFormats(this.ajv); // Add format validators
  }

  async execAsync() {
    const {
      data,         // The data to be validated
      schema,       // The JSON Schema object directly
      schemaPath,   // Optional: Path to a JSON Schema file
      action = 'validate' // Currently only 'validate'
    } = this.params;

    if (action !== 'validate') {
      throw new Error('DataValidationNode currently only supports `action: "validate"`.');
    }
    if (!data) {
      throw new Error('DataValidationNode requires `data` to validate.');
    }
    if (!schema && !schemaPath) {
      throw new Error('DataValidationNode requires either `schema` or `schemaPath`.');
    }

    let validationSchema;
    if (schema) {
      validationSchema = schema;
    } else if (schemaPath) {
      try {
        const schemaContent = await fs.readFile(schemaPath, 'utf8');
        validationSchema = JSON.parse(schemaContent);
      } catch (e) {
        throw new Error(`Failed to read or parse schema file from ${schemaPath}: ${e.message}`);
      }
    }

    const validate = this.ajv.compile(validationSchema);
    const isValid = validate(data);

    if (isValid) {
      return { isValid: true, errors: null };
    } else {
      return { isValid: false, errors: validate.errors };
    }
  }
}
