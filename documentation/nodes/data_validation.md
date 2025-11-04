## DataValidationNode

The `DataValidationNode` validates structured data against a JSON Schema.

### Parameters

*   `data`: The data to be validated.
*   `schema`: The JSON Schema object directly.
*   `schemaPath`: Optional. Path to a JSON Schema file. If provided, 'schema' parameter is ignored.
*   `action`: The action to perform. Currently only 'validate' is supported.
