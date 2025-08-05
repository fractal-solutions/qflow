import { AsyncFlow, AsyncNode, AsyncParallelBatchFlow } from '../src/qflow.js';
import { ScrapeURLNode } from '../src/nodes/webscraper.js';

// --- Test Workflow for Web Scraper Node ---

/**
 * A node to display the scraped content.
 */
class DisplayScrapedContentNode extends AsyncNode {
  async execAsync(scrapedHtml) { // scrapedHtml is the prepRes from the previous node
    const { url } = this.params; // URL is passed via params from the batch flow

    if (!scrapedHtml) {
      console.log(`[DisplayContent] No HTML content found for ${url || 'unknown URL'}.`);
      return 'error';
    }

    console.log(`\n--- Scraped Content for: ${url} ---\n`);
    console.log(scrapedHtml.substring(0, 500) + '...'); // Log first 500 characters
    console.log(`\n--- End Content for: ${url} ---\n`);
    return scrapedHtml.length; // Return character count as the result
  }
}

(async () => {
  console.log('--- Running Web Scraper Batch Test Workflow ---');

  // 1. Create instances of the nodes
  const scrapeNode = new ScrapeURLNode();
  // No need to override postAsync here, as execAsync's return value is passed directly

  const displayNode = new DisplayScrapedContentNode();

  // 2. Define the workflow: Scrape -> Display
  scrapeNode.next(displayNode);

  // 3. Create the batch flow
  const scraperBatchFlow = new AsyncParallelBatchFlow(scrapeNode);

  // Define the URLs to scrape in the prepAsync of the flow
  // Each item in this array will be passed as params to the scrapeNode for each batch item
  scraperBatchFlow.prepAsync = async () => [
    { url: 'https://example.com' },
    { url: 'https://www.iana.org/domains/example' },
    { url: 'https://www.w3.org/' }
  ];

  // 4. Run the flow
  try {
    const results = await scraperBatchFlow.runAsync({});
    console.log('\n--- Web Scraper Batch Test Workflow Finished ---');
    console.log('Final Results (character counts):', results);
  } catch (error) {
    console.error('\n--- Web Scraper Batch Test Workflow Failed ---', error);
  }
})();