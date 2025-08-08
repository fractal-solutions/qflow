import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { SubFlowNode, IteratorNode } from '../src/nodes/index.js';

// 1. Define a simple, reusable node and flow
// This sub-flow will be executed by both the SubFlowNode and the IteratorNode.

class LogItemNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    // The node expects an 'item' to be in the shared state.
    const { item } = shared;
    const message = `[LogItemNode] Processing item: ${JSON.stringify(item)}`;
    console.log(message);
    return message; // Return the message as the result
  }
}

// Create an instance of the node that will be the single step in our sub-flow
const logItem = new LogItemNode();

// Create the reusable sub-flow
const subFlow = new AsyncFlow(logItem);

// 2. Create the main flow that will use the new tools

// This node will prepare the data for the IteratorNode
class PrepareDataNode extends AsyncNode {
  async execAsync() {
    console.log('\n[MainFlow] Preparing data for the iterator...');
    // This data will be passed to the IteratorNode
    return [
      { id: 1, task: 'first' },
      { id: 2, task: 'second' },
      { id: 3, task: 'third' },
    ];
  }

  async postAsync(shared, prepRes, execRes) {
    // Store the array of items in the shared state for the iterator to use
    shared.itemsToIterate = execRes;
    return 'default';
  }
}

(async () => {
  console.log('--- Running Sub-Flow and Iterator Test Workflow ---');

  // --- Part 1: Using SubFlowNode ---
  console.log('\n--- Testing SubFlowNode --- ');
  const subFlowNode = new SubFlowNode();
  subFlowNode.setParams({
    flow: subFlow, // Pass the reusable flow
    shared: { item: { id: 99, task: 'single execution' } } // Provide the shared state it needs
  });

  const mainFlow1 = new AsyncFlow(subFlowNode);
  const subFlowResult = await mainFlow1.runAsync({});
  console.log(`[MainFlow] SubFlowNode finished with result: ${subFlowResult}`);

  // --- Part 2: Using IteratorNode ---
  console.log('\n--- Testing IteratorNode --- ');
  const prepareData = new PrepareDataNode();
  const iteratorNode = new IteratorNode();

  // The iterator will get its items from the shared state prepared by the previous node
  iteratorNode.prepAsync = async (shared) => {
    iteratorNode.setParams({
      items: shared.itemsToIterate, // The array of items to loop over
      flow: subFlow, // The flow to execute for each item
    });
  };

  prepareData.next(iteratorNode);

  const mainFlow2 = new AsyncFlow(prepareData);
  const iteratorResult = await mainFlow2.runAsync({});
  console.log(`\n[MainFlow] IteratorNode finished. Results from each iteration:`);
  console.log(iteratorResult);

  console.log('\n--- Sub-Flow and Iterator Test Workflow Finished ---');
})();
