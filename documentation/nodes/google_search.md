## GoogleSearchNode

The `GoogleSearchNode` performs a web search using the Google Custom Search API.

### Parameters

*   `query`: The search query.
*   `apiKey`: Your Google API Key.
*   `cseId`: Your Custom Search Engine ID.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { GoogleSearchNode } from '@fractal-solutions/qflow/nodes';

// --- Configuration for Google Search ---
// IMPORTANT: Replace with your actual Google API Key and Custom Search Engine ID
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || 'YOUR_GOOGLE_CSE_ID_HERE';

(async () => {
  console.log('\n--- Running Google Search Test ---');

  if (GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE' || GOOGLE_CSE_ID === 'YOUR_GOOGLE_CSE_ID_HERE') {
    console.warn("WARNING: Google API Key or CSE ID is not set. Please set them to run the flow.");
    return;
  }

  const googleNode = new GoogleSearchNode();
  googleNode.setParams({
    query: 'What is an autonomous agent?',
    apiKey: GOOGLE_API_KEY,
    cseId: GOOGLE_CSE_ID,
  });

  googleNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('\n--- Google Search Results ---');
    console.log(execRes.slice(0, 5)); // Log top 5 results
    console.log('---------------------------\n');
    return 'default';
  };

  const googleFlow = new AsyncFlow(googleNode);
  try {
    await googleFlow.runAsync({});
    console.log('--- Google Search Test Finished ---');
  } catch (error) {
    console.error('--- Google Search Test Failed ---', error);
  }
})();
```
