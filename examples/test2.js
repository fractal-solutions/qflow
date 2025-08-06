import {
  Node,
  Flow,
  AsyncNode,
  AsyncFlow,
  BatchFlow,
  AsyncParallelBatchFlow
} from '../src/qflow.js';

// Test 1: Async Flow
console.log('--- Running Test 1: Async Flow ---');

class MyAsyncNode extends AsyncNode {
  async execAsync() {
    console.log('AsyncNode: Starting...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('AsyncNode: Finished!');
    return 'default';
  }
}

const asyncNode1 = new MyAsyncNode();
const asyncNode2 = new MyAsyncNode();
asyncNode1.next(asyncNode2);

const asyncFlow = new AsyncFlow(asyncNode1);
await asyncFlow.runAsync({});

// Test 2: Conditional Transitions
console.log('\n--- Running Test 2: Conditional Transitions ---');

class ConditionalNode extends Node {
  exec() {
    if (this.params.shouldGoLeft) {
      console.log('ConditionalNode: Going left');
      return 'left';
    } else {
      console.log('ConditionalNode: Going right');
      return 'right';
    }
  }
}

// Helper node for conditional transition test
function MessageNode(message) {
  return new (class extends Node {
    exec() {
      console.log(message);
      return 'default';
    }
  })();
}

const conditionalNode = new ConditionalNode();
conditionalNode.setParams({ shouldGoLeft: true });
const leftNode = new MessageNode('Went Left');
const rightNode = new MessageNode('Went Right');

conditionalNode.next(leftNode, 'left');
conditionalNode.next(rightNode, 'right');

const conditionalFlow = new Flow(conditionalNode);
conditionalFlow.run({});

const conditionalNode2 = new ConditionalNode();
conditionalNode2.setParams({ shouldGoLeft: false });
conditionalNode2.next(leftNode, 'left');
conditionalNode2.next(rightNode, 'right');
const conditionalFlow2 = new Flow(conditionalNode2);
conditionalFlow2.run({});


// Test 3: Retries
console.log('\n--- Running Test 3: Retries ---');

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

// Test 4: Batch Flow
console.log('\n--- Running Test 4: Batch Flow ---');

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

// Test 5: Async Parallel Batch Flow
console.log('\n--- Running Test 5: Async Parallel Batch Flow ---');

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


