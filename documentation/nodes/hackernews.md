## HackerNewsNode

The `HackerNewsNode` fetches top stories and item details from Hacker News.

### Parameters

*   `action`: The Hacker News action to perform: 'top_stories' or 'item_details'.
*   `itemId`: The ID of the item to fetch details for.

### Example Usage

```javascript
import { AsyncFlow, AsyncBatchNode } from '@fractal-solutions/qflow';
import { GetTopStoriesNode, GetItemNode } from '@fractal-solutions/qflow/nodes';

// --- Test Workflow for Hacker News Nodes ---

class ProcessStoriesNode extends AsyncBatchNode {
  async prepAsync(shared) {
    return shared.storyIds;
  }

  async execAsync(item) {
    const getItem = new GetItemNode();
    getItem.setParams({ id: item });
    return await getItem.runAsync({});
  }
}

(async () => {
  console.log('--- Running Hacker News Test Workflow ---');

  // 1. Create instances of the nodes
  const getTopStories = new GetTopStoriesNode();
  getTopStories.setParams({ limit: 5 }); // Fetch the top 5 stories

  const processStories = new ProcessStoriesNode();

  // 2. Define the workflow
  getTopStories.next(processStories);

  // 3. Create and run the flow
  const hnFlow = new AsyncFlow(getTopStories);

  try {
    const result = await hnFlow.runAsync({});
    console.log('\n--- Hacker News Test Workflow Finished ---');
    console.log('Final Result:', result);
  } catch (error) {
    console.error('\n--- Hacker News Test Workflow Failed ---', error);
  }
})();
```
