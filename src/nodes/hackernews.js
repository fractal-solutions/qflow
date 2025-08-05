import { AsyncNode } from '../qflow.js';

const API_BASE = 'https://hacker-news.firebaseio.com/v0';

/**
 * Fetches the top story IDs from the Hacker News API.
 * @param {object} params - The parameters for the node.
 * @param {number} [params.limit=10] - The maximum number of story IDs to return.
 * @returns {Promise<number[]>} A promise that resolves to an array of story IDs.
 */
export class GetTopStoriesNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    const { limit = 10 } = this.params;
    console.log(`[HackerNews] Fetching top ${limit} stories...`);

    const response = await fetch(`${API_BASE}/topstories.json`);
    if (!response.ok) {
      throw new Error(`Hacker News API error: ${response.status}`);
    }

    const storyIds = await response.json();
    const limitedIds = storyIds.slice(0, limit);

    console.log(`[HackerNews] Found ${limitedIds.length} stories.`);
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
  async execAsync() {
    const { id } = this.params;
    if (!id) {
      throw new Error('Item ID is required for GetItemNode.');
    }

    console.log(`[HackerNews] Fetching item ${id}...`);

    const response = await fetch(`${API_BASE}/item/${id}.json`);
    if (!response.ok) {
      throw new Error(`Hacker News API error: ${response.status}`);
    }

    const item = await response.json();
    console.log(`[HackerNews] Fetched item title: ${item.title}`);
    console.log(`[HackerNews] Fetched item: ${item.url}`);
    return item;
  }
}
 