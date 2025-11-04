## DataExtractorNode

The `DataExtractorNode` extracts structured data from HTML, JSON, or plain text.

### Parameters

*   `input`: The content string from which to extract data.
*   `type`: The type of content to extract from (html, json, or text).
*   `selector`: A CSS selector to target elements (for HTML).
*   `jsonPath`: A dot-notation path to extract data (for JSON).
*   `regex`: A regular expression to match and extract data (for text).
*   `group`: The capturing group index to return from the regex match.

### Example Usage

```javascript
import { AsyncNode, AsyncFlow } from '@fractal-solutions/qflow';
import { DataExtractorNode, ScrapeURLNode } from '@fractal-solutions/qflow/nodes';

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
})();
```
