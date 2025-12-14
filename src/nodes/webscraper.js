import { AsyncNode } from '@/qflow.js';
import { log } from '@/logger.js';

/**
 * Fetches the HTML content of a given URL.
 * @param {object} params - The parameters for the node.
 * @param {string} params.url - The URL to scrape.
 * @returns {Promise<string>} A promise that resolves to the HTML content of the page.
 */
export class ScrapeURLNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "web_scraper",
      description: "Fetches HTML content from a URL. Use with 'data_extractor' for specifics.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to scrape."
          }
        },
        required: ["url"]
      }
    };
  }

  async execAsync() {
    const { url } = this.params;

    if (!url) {
      throw new Error('URL is required for ScrapeURLNode.');
    }

    log(`[WebScraper] Scraping URL: ${url}...`, this.params.logging);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} - ${response.statusText}`);
    }

    const html = await response.text();
    log(`[WebScraper] Successfully scraped URL: ${url}`, this.params.logging);
    return html;
  }

  async postAsync(shared, prepRes, execRes) {
    // Truncate the scraped HTML to avoid exceeding LLM context windows
    const MAX_HTML_LENGTH = 4000; 
    shared.webScrapedContent = execRes.substring(0, MAX_HTML_LENGTH);
    if (execRes.length > MAX_HTML_LENGTH) {
      log(`[WebScraper] Truncated HTML content from ${execRes.length} to ${MAX_HTML_LENGTH} characters.`, this.params.logging, { type: 'warn' });
    }
    return shared.webScrapedContent;
  }
}
