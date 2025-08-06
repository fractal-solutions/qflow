import { AsyncNode, Node, AsyncFlow } from '../src/qflow.js';

// Test 3: Advanced Workflow with Public API
console.log('--- Running Test 3: Advanced Workflow with Public API ---');

// 1. Node to fetch a cat fact from a public API
class FetchCatFactNode extends AsyncNode {
  async execAsync() {
    console.log('Fetching a cat fact...');
    const response = await fetch('https://catfact.ninja/fact');
    const data = await response.json();
    console.log(`Fetched fact: ${data.fact}`);
    return data.fact;
  }

  async postAsync(shared, prepRes, execRes) {
    shared.fact = execRes;
    return 'default';
  }
}

// 2. Node to process the fact and check its length
class ProcessFactNode extends Node {
  prep(shared) {
    return shared.fact;
  }

  exec(fact) {
    console.log(`Processing fact: "${fact}"`);
    if (fact.length > 100) {
      return 'long';
    } else {
      return 'short';
    }
  }

  post(shared, prepRes, execRes) {
    return execRes;
  }
}

// 3. Nodes to handle the different branches
class ShortFactNode extends Node {
  exec() {
    console.log('This is a short fact.');
    return 'default';
  }
}

class LongFactNode extends Node {
  exec() {
    console.log('This is a long fact.');
    return 'default';
  }
}

// 4. Wire everything together
const fetchNode = new FetchCatFactNode();
const processNode = new ProcessFactNode();
const shortFactNode = new ShortFactNode();
const longFactNode = new LongFactNode();

fetchNode.next(processNode);
processNode.next(shortFactNode, 'short');
processNode.next(longFactNode, 'long');

// 5. Create and run the flow
const advancedFlow = new AsyncFlow(fetchNode);

advancedFlow.prepAsync = async () => {
  console.log('Starting Advanced Workflow');
  // In a real application, you might fetch some initial data here.
  return {};
};

advancedFlow.postAsync = async (shared, prepRes, execRes) => {
  console.log('Advanced workflow finished.');
};

await advancedFlow.runAsync({});
