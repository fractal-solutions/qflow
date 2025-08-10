
import { AsyncNode } from '../qflow.js';
import simpleGit from 'simple-git';

export class GitNode extends AsyncNode {
  async execAsync() {
    const {
      action,
      repoPath,
      remoteUrl,
      files,
      message,
      branch,
      remote = 'origin',
    } = this.params;

    if (!repoPath && action !== 'clone') {
      throw new Error('GitNode requires a `repoPath` for all actions except `clone`.');
    }

    const git = simpleGit(repoPath);

    let result = {};

    switch (action) {
      case 'clone':
        if (!remoteUrl || !repoPath) throw new Error('`remoteUrl` and `repoPath` are required for `clone`.');
        await git.clone(remoteUrl, repoPath);
        result = { message: `Repository cloned from ${remoteUrl} to ${repoPath}` };
        break;
      case 'init':
        await git.init();
        result = { message: `Initialized empty Git repository in ${repoPath}` };
        break;
      case 'add':
        if (!files) throw new Error('`files` parameter is required for `add` action.');
        await git.add(files);
        result = { message: `Files added: ${files.join(', ')}` };
        break;
      case 'commit':
        if (!message) throw new Error('`message` parameter is required for `commit` action.');
        const commitResult = await git.commit(message);
        result = { message: 'Commit successful', ...commitResult };
        break;
      case 'push':
        if (!branch) throw new Error('`branch` parameter is required for `push` action.');
        await git.push(remote, branch);
        result = { message: `Pushed to ${remote}/${branch}` };
        break;
      case 'pull':
        if (!branch) throw new Error('`branch` parameter is required for `pull` action.');
        await git.pull(remote, branch);
        result = { message: `Pulled from ${remote}/${branch}` };
        break;
      case 'status':
        const statusResult = await git.status();
        result = statusResult;
        break;
      default:
        throw new Error(`Unsupported Git action: ${action}`);
    }

    return result;
  }
}
