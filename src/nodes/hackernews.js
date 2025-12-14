import { AsyncNode } from '../qflow.js';
import { log } from '../logger.js';

const API_BASE = 'https://hacker-news.firebaseio.com/v0';

/**
 * Fetches the top story IDs from the Hacker News API.
 * @param {object} params - The parameters for the node.
 * @param {number} [params.limit=10] - The maximum number of story IDs to return.
 * @returns {Promise<number[]>} A promise that resolves to an array of story IDs.
 */
export class GetTopStoriesNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "hackernews_get_top_stories",
      description: "Fetches the top story IDs from the Hacker News API.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Optional. The maximum number of story IDs to return. Defaults to 10."
          }
        },
        required: []
      }
    };
  }

  async execAsync(prepRes, shared) {
    const { limit = 10 } = this.params;
    log(`[HackerNews] Fetching top ${limit} stories...`, this.params.logging);

    const response = await fetch(`${API_BASE}/topstories.json`);
    if (!response.ok) {
      throw new Error(`Hacker News API error: ${response.status}`);
    }

    const storyIds = await response.json();
    const limitedIds = storyIds.slice(0, limit);

    log(`[HackerNews] Found ${limitedIds.length} stories.`, this.params.logging);
    shared.storyIds = limitedIds;
    return 'default';
  }
}

/**
 * Fetches the details of a specific item from the Hacker News API.
 * @param {object} params - The parameters for the node.
 * @param {number} params.id - The ID of the item to fetch.
 * @returns {Promise<object>} A promise that resolves to the item details.
 */
export class GetItemNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "hackernews_get_item",
      description: "Fetches the details of a specific item from the Hacker News API.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "The ID of the item to fetch."
          }
        },
        required: ["id"]
      }
    };
  }

  async execAsync() {
    const { id } = this.params;
    if (!id) {
      throw new Error('Item ID is required for GetItemNode.');
    }

    log(`[HackerNews] Fetching item ${id}...`, this.params.logging);

    const response = await fetch(`${API_BASE}/item/${id}.json`);
    if (!response.ok) {
      throw new Error(`Hacker News API error: ${response.status}`);
    }

    const item = await response.json();
    log(`[HackerNews] Fetched item title: ${item.title}`, this.params.logging);
    log(`[HackerNews] Fetched item: ${item.url}`, this.params.logging);
    return item;
  }
}
 