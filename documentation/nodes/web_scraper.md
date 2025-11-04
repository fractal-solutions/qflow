## WebScraperNode

The `WebScraperNode` fetches the HTML content of a given URL.

### Parameters

*   `url`: The URL to scrape.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { ScrapeURLNode } from '@fractal-solutions/qflow/nodes';

(async () => {
  console.log('--- Running WebScraperNode Example ---');

  const scrapeNode = new ScrapeURLNode();
  scrapeNode.setParams({
    url: 'https://example.com'
  });

  scrapeNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('\n--- Scraped Content ---');
    console.log(execRes.substring(0, 500) + '...'); // Log first 500 characters
    console.log('------------------------\n');
    return 'default';
  };

  const scrapeFlow = new AsyncFlow(scrapeNode);

  try {
    await scrapeFlow.runAsync({});
    console.log('--- WebScraperNode Example Finished ---');
  } catch (error) {
    console.error('--- WebScraperNode Example Failed ---', error);
  }
})();
```
