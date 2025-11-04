### 13. Data Extraction Example

Extracting structured data from HTML, JSON, or plain text.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DataExtractorNode, WebScraperNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running DataExtractorNode Test Workflow ---');

  // Example 1: Extracting from HTML (using WebScraperNode to get HTML)
  console.log('\n--- HTML Extraction Example ---');
  const scrapeNode = new WebScraperNode();
  scrapeNode.setParams({ url: 'https://www.example.com' });

  const extractHtmlNode = new DataExtractorNode();
  extractHtmlNode.setParams({
    type: 'html',
    selector: 'h1' // Extract the text from the first h1 tag
  });

  scrapeNode.next(extractHtmlNode);

  extractHtmlNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted HTML (h1 content):', execRes);
    return 'default';
  };

  const htmlFlow = new AsyncFlow(scrapeNode);
  try {
    await htmlFlow.runAsync({});
  } catch (error) {
    console.error('HTML Extraction Flow Failed:', error);
  }

  // Example 2: Extracting from JSON
  console.log('\n--- JSON Extraction Example ---');
  const jsonContent = JSON.stringify({
    user: {
      id: 123,
      name: 'John Doe',
      contact: {
        email: 'john.doe@example.com',
        phone: '123-456-7890'
      },
      roles: ['admin', 'editor']
    },
    products: [
      { id: 1, name: 'Laptop', price: 1200 },
      { id: 2, name: 'Mouse', price: 25 }
    ]
  }, null, 2);

  const extractJsonNode = new DataExtractorNode();
  extractJsonNode.setParams({
    input: jsonContent,
    type: 'json',
    jsonPath: 'user.contact.email' // Extract email from nested JSON
  });

  extractJsonNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted JSON (user email):', execRes);
    return 'default';
  };

  const jsonFlow = new AsyncFlow(extractJsonNode);
  try {
    await jsonFlow.runAsync({});
  } catch (error) {
    console.error('JSON Extraction Flow Failed:', error);
  }

  // Example 3: Extracting from Text (Regex)
  console.log('\n--- Text Extraction Example (Regex) ---');
  const textContent = "User IDs: user_123, user_456, admin_789. Emails: test@example.com, another@domain.org.";

  const extractTextNode = new DataExtractorNode();
  extractTextNode.setParams({
    input: textContent,
    type: 'text',
    regex: 'user_(\\d+)', // Extract numbers after 'user_'
    group: 1 // Capture group 1
  });

  extractTextNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted Text (User IDs):', execRes);
    return 'default';
  };

  const textFlow = new AsyncFlow(extractTextNode);
  try {
    await textFlow.runAsync({});
  } catch (error) {
    console.error('Text Extraction Flow Failed:', error);
  }

  console.log('\n--- DataExtractorNode Test Workflow Finished ---');
})();

```