import { AsyncNode } from '../qflow.js';

/**
 * Fetches the HTML content of a given URL.
 * @param {object} params - The parameters for the node.
 * @param {string} params.url - The URL to scrape.
 * @returns {Promise<string>} A promise that resolves to the HTML content of the page.
 */
export class ScrapeURLNode extends AsyncNode {
  async execAsync() {
    const { url } = this.params;

    if (!url) {
      throw new Error('URL is required for ScrapeURLNode.');
    }

    console.log(`[WebScraper] Scraping URL: ${url}...`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} - ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[WebScraper] Successfully scraped URL: ${url}`);
    return html;
  }

  async postAsync(shared, prepRes, execRes) {
    // The scraped HTML (execRes) will be passed as prepRes to the next node.
    // We don't need to store it in shared for this specific flow.
    return 'default';
  }
}
