import { AsyncNode, AsyncFlow } from '../src/qflow.js';
import { DataExtractorNode, ReadFileNode, ScrapeURLNode } from '../src/nodes';

(async () => {
  console.log('--- Running DataExtractorNode Test Workflow ---');

  // --- Example 1: Extracting from HTML (using WebScraperNode to get HTML) ---
  console.log('\n--- HTML Extraction Example ---');
  const scrapeNode = new ScrapeURLNode();
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
    const scrapedHtml = await htmlFlow.runAsync({});

    extractHtmlNode.setParams({
      input: scrapedHtml,
      type: 'html',
      selector: 'h1' // Extract the text from the first h1 tag
    });

    const extractedResult = await new AsyncFlow(extractHtmlNode).runAsync({});

    console.log('Extracted HTML (h1 content):', extractedResult);
    if (extractedResult && extractedResult[0] === 'Example Domain') {
      console.log('HTML Extraction Test Passed: h1 content extracted as expected.');
    } else {
      console.error('HTML Extraction Test Failed: Unexpected h1 content.', extractedResult);
    }
  } catch (error) {
    console.error('HTML Extraction Flow Failed:', error);
  }

  // --- Example 2: Extracting from JSON (using ReadFileNode to get JSON content) ---
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

  const writeJsonNode = new (class extends AsyncNode {
    async execAsync() {
      return jsonContent;
    }
  })();

  const extractJsonNode = new DataExtractorNode();
  extractJsonNode.setParams({
    input: jsonContent,
    type: 'json',
    jsonPath: 'user.contact.email' // Extract email from nested JSON
  });

  writeJsonNode.next(extractJsonNode);

  extractJsonNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted JSON (user email):', execRes);
    // Demonstrate array access
    const extractProductNode = new DataExtractorNode();
    extractProductNode.setParams({
      input: jsonContent,
      type: 'json',
      jsonPath: 'products[0].name' // Extract first product name
    });
    const productFlow = new AsyncFlow(extractProductNode);
    const productResult = await productFlow.runAsync({});
    console.log('Extracted JSON (first product name):', productResult);
    return 'default';
  };

  const jsonFlow = new AsyncFlow(writeJsonNode);
  try {
    await jsonFlow.runAsync({});
  } catch (error) {
    console.error('JSON Extraction Flow Failed:', error);
  }

  // --- Example 3: Extracting from Text (Regex) ---
  console.log('\n--- Text Extraction Example (Regex) ---');
  const textContent = "User IDs: user_123, user_456, admin_789. Emails: test@example.com, another@domain.org.";

  const extractTextNode = new DataExtractorNode();
  extractTextNode.setParams({
    input: textContent,
    type: 'text',
    regex: 'user_(\d+)', // Extract numbers after 'user_'
    group: 1 // Capture group 1
  });

  extractTextNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('Extracted Text (User IDs):', execRes);
    // Another regex example
    const extractEmailsNode = new DataExtractorNode();
    extractEmailsNode.setParams({
      input: textContent,
      type: 'text',
      regex: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})' // Extract email addresses
    });
    const emailFlow = new AsyncFlow(extractEmailsNode);
    const emailResult = await emailFlow.runAsync({});
    console.log('Extracted Text (Emails):', emailResult);
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
