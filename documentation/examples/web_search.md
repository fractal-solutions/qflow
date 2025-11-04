### 11. Web Search Example

Performing web searches using both a free metasearch engine and a commercial API.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { DuckDuckGoSearchNode, GoogleSearchNode } from '@fractal-solutions/qflow/nodes';

// Example 1: Using DuckDuckGo (no API key needed)
const ddgSearch = new DuckDuckGoSearchNode();
ddgSearch.setParams({ query: 'qflow library github' });
ddgSearch.postAsync = async (shared, prepRes, execRes) => {
  console.log('\n--- DuckDuckGo Search Results ---');
  execRes.slice(0, 5).forEach(r => console.log(`- ${r.title}: ${r.link}`));
  return 'default';
};

// Example 2: Using Google Custom Search (requires API key and CSE ID)
const googleSearch = new GoogleSearchNode();
googleSearch.setParams({
  query: 'qflow framework benefits',
  apiKey: process.env.GOOGLE_API_KEY, // Set this env var
  cseId: process.env.GOOGLE_CSE_ID   // Set this env var
});
googleSearch.postAsync = async (shared, prepRes, execRes) => {
  console.log('\n--- Google Search Results ---');
  execRes.slice(0, 5).forEach(r => console.log(`- ${r.title}: ${r.link}`));
  return 'default';
};

// Chain them or run independently
const flow1 = new AsyncFlow(ddgSearch);
await flow1.runAsync({});

// Uncomment the following lines to run the Google Search example
// const flow2 = new AsyncFlow(googleSearch);
// await flow2.runAsync({});
```
