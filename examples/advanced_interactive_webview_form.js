import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { InteractiveWebviewNode } from '../src/nodes/interactive_webview.js';
import { DataValidationNode } from '../src/nodes/data_validation.js';
import { promises as fs } from 'fs';
import path from 'path';

// Define a simple JSON schema for validation
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 18 },
  },
  required: ['name', 'email', 'age'],
  errorMessage: {
    properties: {
      name: 'Name must be at least 3 characters long.',
      email: 'Invalid email format.',
      age: 'Age must be 18 or older.',
    },
    required: {
      name: 'Name is required.',
      email: 'Email is required.',
      age: 'Age is required.',
    },
  },
};

async function runAdvancedInteractiveWebviewForm() {
  console.log('--- Running Advanced Interactive Webview Form Demo ---');

  // Read the HTML content from the file
  const htmlFilePath = path.join(import.meta.dir, 'html', 'registration_form.html');
  const initialHtml = await fs.readFile(htmlFilePath, 'utf-8');

  // 1. Node to display the form and capture input
  // This node will be re-instantiated if validation fails to open a new webview
  const createFormWebviewNode = () => {
    const node = new InteractiveWebviewNode();
    node.setParams({
      mode: 'custom',
      title: 'User Registration Form',
      width: 600,
      height: 450,
      theme: 'light',
      persistent: false, // Webview closes after submission
      html: initialHtml,
    });
    return node;
  };

  // 2. Node to validate the form data
  const validateData = new DataValidationNode();
  validateData.setParams({ schema: userSchema });

  // 3. Node to process the form data and validation result
  class FormProcessorNode extends AsyncNode {
    constructor(validationNode) {
      super();
      this.validationNode = validationNode;
    }

    async execAsync(prepRes, shared) {
      const formData = JSON.parse(shared.webviewResult); // Data from webview
      
      this.validationNode.setParams({ data: formData });
      const validationResult = await new AsyncFlow(this.validationNode).runAsync({});

      if (!validationResult.isValid) {
        console.log('Validation failed:', validationResult.errors);
        // In this blocking model, we can't send feedback to the *same* webview.
        // The webview has already closed. We'll log errors and re-display.
        shared.validationErrors = validationResult.errors;
        return 'validation_failed'; // Transition to re-display form
      } else {
        // Data is valid
        console.log('Form data is valid:', formData);
        shared.validatedFormData = formData; // Store validated data in shared state
        return 'validation_succeeded'; // Transition to end flow or next step
      }
    }
  }
  const formProcessorNode = new FormProcessorNode(validateData);

  // Define the flow
  // The flow will loop, creating a new webview each time validation fails.
  const flow = new AsyncFlow(createFormWebviewNode());

  // Connect the initial form display to the processor
  flow.startNode.next(formProcessorNode, 'default');

  // If validation fails, loop back to create a new form webview
  formProcessorNode.next(createFormWebviewNode(), 'validation_failed');

  // If validation succeeds, the flow ends (or goes to another node)
  // formProcessorNode.next(someOtherNode, 'validation_succeeded');

  try {
    await flow.runAsync({});
    console.log('Advanced Interactive Webview Form Demo Finished. Final Data:', flow.shared.validatedFormData);
  } catch (error) {
    console.error('Advanced Interactive Webview Form Demo Failed:', error);
  }
}

runAdvancedInteractiveWebviewForm();