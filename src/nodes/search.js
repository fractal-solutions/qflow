import { AsyncNode } from '../qflow.js';
import * as cheerio from 'cheerio';

/**
 * Performs a web search using DuckDuckGo's HTML-only interface.
 * This node does not require an API key and is designed for reliability without heavy dependencies.
 * @param {object} params - The parameters for the node.
 * @param {string} params.query - The search query.
 * @returns {Promise<object[]>} A promise that resolves to an array of search result objects.
 */
export class DuckDuckGoSearchNode extends AsyncNode {
  async execAsync() {
    const { query } = this.params;

    if (!query) {
      throw new Error('DuckDuckGoSearchNode requires a `query` parameter.');
    }

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log(`[DuckDuckGo] Searching for: "${query}"`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML search failed with status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];
    $('.result__body').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const link = $(el).find('.result__url').attr('href');
      const snippet = $(el).find('.result__snippet').text().trim();

      if (title && link) {
        results.push({
          title,
          link,
          snippet,
        });
      }
    });

    return results;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.searchResults = execRes;
    return 'default';
  }
}

/**
 * Performs a web search using the Google Custom Search JSON API.
 * This node requires a Google API Key and a Custom Search Engine ID.
 * @param {object} params - The parameters for the node.
 * @param {string} params.query - The search query.
 * @param {string} params.apiKey - Your Google API Key.
 * @param {string} params.cseId - Your Custom Search Engine ID.
 * @returns {Promise<object[]>} A promise that resolves to an array of search result objects.
 */
export class GoogleSearchNode extends AsyncNode {
  async execAsync() {
    const { query, apiKey, cseId } = this.params;

    if (!query || !apiKey || !cseId) {
      throw new Error('GoogleSearchNode requires `query`, `apiKey`, and `cseId` parameters.');
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;
    console.log(`[Google Search] Searching for: "${query}"`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Search API error: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();

    return (data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }));
  }

  async postAsync(shared, prepRes, execRes) {
    shared.searchResults = execRes;
    return 'default';
  }
}
