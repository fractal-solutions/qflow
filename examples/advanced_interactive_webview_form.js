import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { InteractiveWebviewNode } from '../src/nodes/interactive_webview.js';
import { DataValidationNode } from '../src/nodes/data_validation.js';
import { promises as fs } from 'fs'; // Import fs for file reading
import path from 'path'; // Import path for path manipulation

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

  const formWebview = new InteractiveWebviewNode();
  formWebview.setParams({
    mode: 'custom', // Use custom mode for full HTML control
    title: 'User Registration Form',
    width: 600,
    height: 450,
    theme: 'light',
    persistent: true, // Keep the webview open for dynamic updates
    html: initialHtml,
  });

  const validateData = new DataValidationNode();
  validateData.setParams({ schema: userSchema });

  class ProcessFormDataNode extends AsyncNode {
    constructor(validateDataNode) {
      super();
      this.validateDataNode = validateDataNode;
    }

    async execAsync(prepRes, shared) {
      const formData = JSON.parse(shared.webviewResult); // Data from webview
      this.validateDataNode.setParams({ data: formData });
      const validationResult = await new AsyncFlow(this.validateDataNode).runAsync({});

      if (!validationResult.isValid) {
        // Send errors back to the webview
        formWebview.sendToWebview('clearErrors();'); // Clear previous errors
        validationResult.errors.forEach(err => {
          const field = err.instancePath.substring(1); // e.g., '/name' -> 'name'
          formWebview.sendToWebview(`displayMessage('error', '${err.message}', '${field}');`);
        });
        formWebview.sendToWebview(`displayMessage('error', 'Please correct the errors above.');`);
        return 'validation_failed'; // Custom action for failed validation
      } else {
        // Data is valid, process it
        console.log('Form data is valid:', formData);
        shared.validatedFormData = formData;
        formWebview.sendToWebview('clearErrors();');
        formWebview.sendToWebview(`displayMessage('success', 'Registration successful for ${formData.name}!');`);
        // Optionally, close the webview after a delay or user action
        // setTimeout(() => formWebview._webviewInstance.destroy(), 3000);
        return 'validation_succeeded';
      }
    }
  }
  const processFormData = new ProcessFormDataNode(validateData);

  // Define the flow
  formWebview.next(processFormData, 'default'); // Default action when form is submitted

  // Handle validation failure: loop back to the form
  processFormData.next(formWebview, 'validation_failed');

  // Handle validation success: end the flow or proceed
  // For this example, we'll just let it end after success message
  // processFormData.next(someNextNode, 'validation_succeeded');

  const flow = new AsyncFlow(formWebview);

  // Run the flow. The webview will stay open until explicitly closed or the process ends.
  await flow.runAsync({});

  console.log('Advanced Interactive Webview Form Demo Finished.');
  // Manually destroy the webview if it's still open after the flow logic
  if (formWebview._webviewInstance && formWebview._webviewInstance.unsafeHandle) {
    formWebview._webviewInstance.destroy();
  }
}

runAdvancedInteractiveWebviewForm();