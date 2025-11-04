### 10. Generic HTTP Request Example

Making a GET request to a public API and printing the response.

```javascript
import { AsyncFlow } from '@fractal-solutions/qflow';
import { HttpRequestNode } from '@fractal-solutions/qflow/nodes';

const getPost = new HttpRequestNode();
getPost.setParams({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'GET'
});

getPost.postAsync = async (shared, prepRes, execRes) => {
  console.log('--- API Response ---');
  console.log('Status:', execRes.status);
  console.log('Body:', execRes.body);
  return 'default';
};

const flow = new AsyncFlow(getPost);
await flow.runAsync({});
```