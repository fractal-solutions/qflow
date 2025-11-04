## GitHubNode

The `GitHubNode` performs GitHub operations like creating and managing issues.

### Parameters

*   `action`: The GitHub action to perform.
*   `owner`: The owner of the repository.
*   `repo`: The name of the repository.
*   `token`: Your GitHub personal access token.
*   `issueNumber`: The issue number.
*   `title`: The title of the issue.
*   `body`: The body of the issue.
*   `assignees`: An array of assignees for the issue.
*   `labels`: An array of labels for the issue.

### Example Usage

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { CreateIssueNode, GetIssueNode } from '@fractal-solutions/qflow/nodes';

// --- Configuration ---
// IMPORTANT: Replace with your actual GitHub token, owner, and repo
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE';
const GITHUB_OWNER = 'YOUR_GITHUB_OWNER_HERE';
const GITHUB_REPO = 'YOUR_GITHUB_REPO_HERE';

// --- Test Workflow for GitHub Nodes ---

(async () => {
  if (GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN_HERE' || GITHUB_OWNER === 'YOUR_GITHUB_OWNER_HERE' || GITHUB_REPO === 'YOUR_GITHUB_REPO_HERE') {
    console.warn("WARNING: GitHub token, owner, or repo is not set. Please set them to run the flow.");
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
```
