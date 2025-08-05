import { AsyncFlow } from '../src/qflow.js';
import { CreateIssueNode, GetIssueNode } from '../src/nodes/github.js';

// --- Configuration ---
// IMPORTANT: Replace with your actual GitHub token, owner, and repo
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE';
const GITHUB_OWNER = 'YOUR_GITHUB_OWNER_HERE';
const GITHUB_REPO = 'YOUR_GITHUB_REPO_HERE';

// --- Test Workflow for GitHub Nodes ---

(async () => {
  if (GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN_HERE' || GITHUB_OWNER === 'YOUR_GITHUB_OWNER_HERE' || GITHUB_REPO === 'YOUR_GITHUB_REPO_HERE') {
    console.warn(`
      *****************************************************************
      * WARNING: GitHub token, owner, or repo is not set.             *
      * Please replace the placeholders in examples/github_test.js or *
      * set the GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO           *
      * environment variables to run the flow.                        *
      *****************************************************************
    `);
    return;
  }

  console.log('--- Running GitHub Test Workflow ---');

  // 1. Create instances of the nodes
  const createIssue = new CreateIssueNode();
  createIssue.setParams({
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    title: '[qflow] Test Issue',
    body: 'This is a test issue created by the qflow GitHub integration test.'
  });

  const getIssue = new GetIssueNode();
  getIssue.setParams({
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO
  });

  // 2. Define the workflow
  createIssue.next(getIssue);

  // 3. Create and run the flow
  const githubFlow = new AsyncFlow(createIssue);

  try {
    const result = await githubFlow.runAsync({});
    console.log('--- GitHub Test Workflow Finished ---');
    console.log('Final Result:', result);
  } catch (error) {
    console.error('--- GitHub Test Workflow Failed ---', error);
  }
})();
