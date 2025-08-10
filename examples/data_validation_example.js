import { AsyncFlow } from '@fractal-solutions/qflow';
import { DataValidationNode, WriteFileNode, ReadFileNode } from '@fractal-solutions/qflow/nodes';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

(async () => {
  console.log('--- Running DataValidationNode Example ---');

  const tempDir = os.tmpdir();
  const schemaFilePath = path.join(tempDir, 'user_schema.json');

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

  // --- Example 2: Validate invalid data directly with schema object ---
  console.log('\n--- Validating INVALID data ---');
  const invalidData = {
    id: "two", // Should be number
    name: "Al", // Too short
    email: "bob@invalid", // Invalid format
    age: 17, // Too young
    extraField: "should not be here" // Additional properties not allowed
  };

  const validateInvalidNode = new DataValidationNode();
  validateInvalidNode.setParams({
    action: 'validate',
    data: invalidData,
    schema: userSchema
  });

  try {
    const result = await new AsyncFlow(validateInvalidNode).runAsync({});
    console.log('Validation Result (Invalid Data):', result);
    if (!result.isValid) {
      console.log('Validation Errors:', JSON.stringify(result.errors, null, 2));
    }
  } catch (error) {
    console.error('Validation Failed (Invalid Data - unexpected):', error.message);
  }

  // --- Example 3: Validate data using a schema loaded from a file ---
  console.log('\n--- Validating data with schema from file ---');

  // Write schema to a temporary file
  const writeSchemaNode = new WriteFileNode();
  writeSchemaNode.setParams({
    filePath: schemaFilePath,
    content: JSON.stringify(userSchema, null, 2)
  });

  try {
    await new AsyncFlow(writeSchemaNode).runAsync({});
    console.log(`Schema written to: ${schemaFilePath}`);

    const dataToValidateFromFile = {
      id: 2,
      name: "Charlie Brown",
      email: "charlie@peanuts.com",
      age: 45,
      isActive: false
    };

    const validateFromFileNode = new DataValidationNode();
    validateFromFileNode.setParams({
      action: 'validate',
      data: dataToValidateFromFile,
      schemaPath: schemaFilePath // Use schemaPath
    });

    const result = await new AsyncFlow(validateFromFileNode).runAsync({});
    console.log('Validation Result (from file schema):', result);
  } catch (error) {
    console.error('Validation from file schema failed:', error.message);
  } finally {
    // --- Cleanup ---
    try {
      console.log(`\n[Cleanup] Removing temporary schema file: ${schemaFilePath}`);
      await fs.unlink(schemaFilePath).catch(() => {});
      console.log('[Cleanup] Cleanup complete.');
    } catch (e) {
      console.warn('[Cleanup] Failed to remove temporary schema file:', e.message);
    }
  }

  console.log('\n--- DataValidationNode Example Finished ---');
})();
