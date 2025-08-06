import { AsyncFlow } from '../src/qflow.js';
import { DuckDuckGoSearchNode, GoogleSearchNode } from '../src/nodes/search.js';

// --- Configuration for Google Search ---
// IMPORTANT: Replace with your actual Google API Key and Custom Search Engine ID
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || 'YOUR_GOOGLE_CSE_ID_HERE';

(async () => {
  // --- Test 1: DuckDuckGoSearchNode (No API Key Needed) ---
  console.log('--- Running DuckDuckGo Search Test ---');
  const ddgNode = new DuckDuckGoSearchNode();
  ddgNode.setParams({ query: 'What is qflow?' });

  ddgNode.postAsync = async (shared, prepRes, execRes) => {
    console.log('\n--- DuckDuckGo Search Results ---');
    console.log(execRes.slice(0, 5)); // Log top 5 results
    console.log('----------------------------\n');
    return 'default';
  };

  const ddgFlow = new AsyncFlow(ddgNode);
  try {
    await ddgFlow.runAsync({});
    console.log('--- DuckDuckGo Search Test Finished ---');
  } catch (error) {
    console.error('--- DuckDuckGo Search Test Failed ---', error);
  }

  // --- Test 2: GoogleSearchNode (API Key Required) ---
  console.log('\n--- Running Google Search Test ---');

  if (GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE' || GOOGLE_CSE_ID === 'YOUR_GOOGLE_CSE_ID_HERE') {
    console.warn(`
      *****************************************************************
      * WARNING: Google API Key or CSE ID is not set.                 *
      * Please replace the placeholders in examples/search_test.js or *
      * set the GOOGLE_API_KEY and GOOGLE_CSE_ID env variables.       *
      *****************************************************************
    `);
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
