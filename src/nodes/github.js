import { AsyncNode } from '../qflow.js';
import { log } from '../logger.js';

const API_BASE = 'https://api.github.com';

/**
 * Creates a new issue in a GitHub repository.
 * @param {object} params - The parameters for the node.
 * @param {string} params.token - The GitHub personal access token.
 * @param {string} params.owner - The owner of the repository.
 * @param {string} params.repo - The name of the repository.
 * @param {string} params.title - The title of the issue.
 * @param {string} [params.body] - The body of the issue.
 * @returns {Promise<object>} A promise that resolves to the created issue object.
 */
export class CreateIssueNode extends AsyncNode {
  async execAsync() {
    const { token, owner, repo, title, body } = this.params;

    if (!token || !owner || !repo || !title) {
      throw new Error('Missing required parameters: token, owner, repo, title');
    }

    log(`[GitHub] Creating issue "${title}" in ${owner}/${repo}...`, this.params.logging);

    const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    const issue = await response.json();
    log(`[GitHub] Successfully created issue #${issue.number}`, this.params.logging);
    return issue;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.createdIssue = execRes; // Put the result in the shared object
    return 'default'; // Return an action to transition
  }
}

/**
 * Retrieves an issue from a GitHub repository.
 * @param {object} params - The parameters for the node.
 * @param {string} params.token - The GitHub personal access token.
 * @param {string} params.owner - The owner of the repository.
 * @param {string} params.repo - The name of the repository.
 * @param {number} params.issue_number - The number of the issue to retrieve.
 * @returns {Promise<object>} A promise that resolves to the issue object.
 */
export class GetIssueNode extends AsyncNode {
  async prepAsync(shared) {
    // Retrieve the issue number from the shared object
    this.params.issue_number = shared.createdIssue?.number;
  }

  async execAsync() {
    const { token, owner, repo, issue_number } = this.params;

    if (!token || !owner || !repo || !issue_number) {
      throw new Error('Missing required parameters: token, owner, repo, issue_number');
    }

    log(`[GitHub] Getting issue #${issue_number} from ${owner}/${repo}...`, this.params.logging);

    const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/issues/${issue_number}`, {
      headers: {
        'Authorization': `token ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    const issue = await response.json();
    log(`[GitHub] Successfully retrieved issue #${issue.number}`, this.params.logging);
    return issue;
  }
}
