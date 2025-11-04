## GitNode

The `GitNode` performs Git operations like clone, add, commit, and push.

### Parameters

*   `action`: The Git action to perform.
*   `repoPath`: The local path to the repository.
*   `remoteUrl`: The URL of the remote repository (for 'clone' action).
*   `files`: An array of file paths to add to the staging area (for 'add' action).
*   `message`: The commit message (for 'commit' action).
*   `branch`: The branch to push to or pull from.
*   `remote`: The name of the remote (e.g., 'origin').
