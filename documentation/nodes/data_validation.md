## DataValidationNode

The `DataValidationNode` validates structured data against a JSON Schema.

### Parameters

*   `data`: The data to be validated.
*   `schema`: The JSON Schema object directly.
*   `schemaPath`: Optional. Path to a JSON Schema file. If provided, 'schema' parameter is ignored.
*   `action`: The action to perform. Currently only 'validate' is supported.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DataValidationNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running DataValidationNode Example ---');

  // --- Define a sample JSON Schema ---
  const userSchema = {
    type: "object",
    properties: {
      id: { type: "number" },
      name: { type: "string", minLength: 3 },
      email: { type: "string", format: "email" },
      age: { type: "number", minimum: 18 },
      isActive: { type: "boolean" }
    },
    required: ["id", "name", "email", "age"],
    additionalProperties: false
  };

  // --- Example 1: Validate valid data directly with schema object ---
  console.log('\n--- Validating VALID data ---');
  const validData = {
    id: 1,
    name: "Alice Smith",
    email: "alice@example.com",
    age: 30,
    isActive: true
  };

  const validateValidNode = new DataValidationNode();
  validateValidNode.setParams({
    action: 'validate',
    data: validData,
    schema: userSchema
  });

  try {
    const result = await new AsyncFlow(validateValidNode).runAsync({});
    console.log('Validation Result (Valid Data):', result);
  } catch (error) {
    console.error('Validation Failed (Valid Data - unexpected):', error.message);
  }

  console.log('\n--- DataValidationNode Example Finished ---');
})();
```
