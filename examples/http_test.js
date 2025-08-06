import { AsyncFlow } from '../src/qflow.js';
import { HttpRequestNode } from '../src/nodes/http.js';

(async () => {
  console.log('--- Running HTTP Request Test Workflow ---');

  // Example: GET request to a public API
  const getPosts = new HttpRequestNode();
  getPosts.setParams({
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET',
  });

  getPosts.postAsync = async (shared, prepRes, execRes) => {
    console.log('\n--- GET Request Result ---');
    console.log('Status:', execRes.status);
    console.log('Body:', execRes.body);
    console.log('------------------------\n');
    return 'default';
  };

  // Example: POST request to create a new post
  const createPost = new HttpRequestNode();
  createPost.setParams({
    url: 'https://jsonplaceholder.typicode.com/posts',
    method: 'POST',
    body: {
      title: 'qflow test',
      body: 'This is a post created by the HttpRequestNode!',
      userId: 1,
    },
  });

  createPost.postAsync = async (shared, prepRes, execRes) => {
    console.log('--- POST Request Result ---');
    console.log('Status:', execRes.status);
    console.log('Body:', execRes.body);
    console.log('-------------------------\n');
    return 'default';
  };

  // Chain the nodes
  getPosts.next(createPost);

  const httpFlow = new AsyncFlow(getPosts);

  try {
    await httpFlow.runAsync({});
    console.log('--- HTTP Request Test Workflow Finished ---');
  } catch (error) {
    console.error('--- HTTP Request Test Workflow Failed ---', error);
  }
})();
