### 5. Batch Processing

Processing multiple items through a flow.

```javascript
import { Node, BatchFlow, AsyncParallelBatchFlow, AsyncNode } from '@fractal-solutions/qflow';

// Synchronous Batch Flow
console.log('\n--- Running Synchronous Batch Flow ---');

class MyBatchNode extends Node {
  exec() {
    console.log(`BatchNode: Processing item ${this.params.item}`);
    return 'default';
  }
}

const batchNode = new MyBatchNode();
const batchFlow = new BatchFlow(batchNode);
batchFlow.prep = () => [ { item: 1 }, { item: 2 }, { item: 3 } ];
batchFlow.run({});
// Expected output:
// BatchNode: Processing item 1
// BatchNode: Processing item 2
// BatchNode: Processing item 3

// Asynchronous Parallel Batch Flow
console.log('\n--- Running Asynchronous Parallel Batch Flow ---');

class MyAsyncParallelBatchNode extends AsyncNode {
  async execAsync() {
    console.log(`AsyncParallelBatchNode: Starting item ${this.params.item}`);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    console.log(`AsyncParallelBatchNode: Finished item ${this.params.item}`);
    return 'default';
  }
}

const asyncParallelBatchNode = new MyAsyncParallelBatchNode();
const asyncParallelBatchFlow = new AsyncParallelBatchFlow(asyncParallelBatchNode);
asyncParallelBatchFlow.prepAsync = async () => [ { item: 1 }, { item: 2 }, { item: 3 }, { item: 4 }, { item: 5 } ];
await asyncParallelBatchFlow.runAsync({});
// Expected output (order may vary due to parallel execution):
// AsyncParallelBatchNode: Starting item 1
// AsyncParallelBatchNode: Starting item 2
// ...
// AsyncParallelBatchNode: Finished item 1
// AsyncParallelBatchNode: Finished item 2
// ...
```