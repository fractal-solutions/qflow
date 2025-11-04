### 6. Retry Mechanism

Configuring a node to retry on failure.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

let retryCount = 0;
class RetryNode extends Node {
  constructor() {
    super(3, 0.1); // 3 retries, 0.1s wait
  }

  exec() {
    retryCount++;
    if (retryCount < 3) {
      console.log(`RetryNode: Failing, attempt ${retryCount}`);
      throw new Error('Failed!');
    } else {
      console.log('RetryNode: Succeeded!');
      return 'default';
    }
  }

  execFallback(prepRes, error) {
    console.log('RetryNode: Fallback executed');
  }
}

const retryNode = new RetryNode();
const retryFlow = new Flow(retryNode);
retryFlow.run({});
// Expected output:
// RetryNode: Failing, attempt 1
// RetryNode: Failing, attempt 2
// RetryNode: Succeeded!
```