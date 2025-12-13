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
  const formWebviewNode = new InteractiveWebviewNode();
  formWebviewNode.setParams({
    mode: 'custom',
    title: 'User Registration Form',
    width: 600,
    height: 450,
    theme: 'light',
    persistent: true, // Keep webview open for feedback
    html: initialHtml,
  });

  // 2. Node to validate the form data
  const validateDataNode = new DataValidationNode();
  validateDataNode.setParams({ schema: userSchema });

  // Use a custom node to handle the event-driven interaction
  class FormHandlerNode extends AsyncNode {
    constructor(webviewNode, validationNode) {
      super();
      this.webviewNode = webviewNode;
      this.validationNode = validationNode;
      this.formSubmittedPromise = null;
      this.resolveFormSubmitted = null;
    }

    async prepAsync(shared) {
      // Subscribe to webview submit events only once
      if (!this.webviewNode._eventEmitter.listenerCount('webview:submit')) {
        this.webviewNode.onWebviewSubmit(async (formDataJson) => {
          const formData = JSON.parse(formDataJson);
          console.log('Received form data from webview:', formData);

          // Validate the data
          this.validationNode.setParams({ data: formData });
          const validationResult = await new AsyncFlow(this.validationNode).runAsync({});

          if (!validationResult.isValid) {
            // Send errors back to the webview
            this.webviewNode.sendToWebview('clearErrors();');
            validationResult.errors.forEach(err => {
              const field = err.instancePath.substring(1) || err.params.missingProperty;
              this.webviewNode.sendToWebview(`displayMessage('error', '${err.message}', '${field}');`);
            });
            this.webviewNode.sendToWebview(`displayMessage('error', 'Please correct the errors above.');`);
            // Do not resolve the promise, keep waiting for another submission
          } else {
            // Data is valid
            console.log('Form data is valid:', formData);
            shared.validatedFormData = formData; // Store validated data in shared state
            this.webviewNode.sendToWebview('clearErrors();');
            this.webviewNode.sendToWebview(`displayMessage('success', 'Registration successful for ${formData.name}!');`);
            
            // Resolve the promise to allow the flow to continue
            if (this.resolveFormSubmitted) {
              this.resolveFormSubmitted(formData);
            }
          }
        });
      }
    }

    async execAsync(prepRes, shared) {
      // This node will wait until the form is successfully submitted and validated
      this.formSubmittedPromise = new Promise(resolve => {
        this.resolveFormSubmitted = resolve;
      });
      return await this.formSubmittedPromise;
    }

    async postAsync(shared, prepRes, execRes) {
      shared.finalFormData = execRes; // Store the final validated data
      return 'default';
    }
  }
  const formHandlerNode = new FormHandlerNode(formWebviewNode, validateDataNode);

  // Define the flow:
  // 1. Start the webview (it will run in the background)
  // 2. The FormHandlerNode will wait for a successful submission from the webview
  formWebviewNode.next(formHandlerNode);

  const mainFlow = new AsyncFlow(formWebviewNode);

  try {
    await mainFlow.runAsync({});
    console.log('Advanced Interactive Webview Form Demo Finished. Final Data:', mainFlow.shared.finalFormData);
  } catch (error) {
    console.error('Advanced Interactive Webview Form Demo Failed:', error);
  } finally {
    // Ensure webview is destroyed when the flow finishes or errors
    if (formWebviewNode._webviewInstance && formWebviewNode._webviewInstance.unsafeHandle) {
      formWebviewNode._webviewInstance.destroy();
    }
  }
}

runAdvancedInteractiveWebviewForm();