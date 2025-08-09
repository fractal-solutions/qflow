import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { IteratorNode, SubFlowNode } from '@fractal-solutions/qflow/nodes';

// --- Sub-Flow Definition ---
// This flow will be executed for each item by the IteratorNode
class ProcessItemNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    // 'shared.item' will contain the current item from the iterator
    const item = shared.item;
    const processedValue = item * 2 + 5; // Example calculation: double and add 5
    console.log(`  [SubFlow] Processing item: ${item}, Result: ${processedValue}`);
    // Store the result back in shared for the main flow to collect
    shared.processedResult = processedValue;
    return processedValue; // Return the result of this node
  }
}

const processItemFlow = new AsyncFlow(new ProcessItemNode());

// --- Main Flow Definition ---
(async () => {
  console.log('--- Running SubFlow and Iterator Example ---');

  // 1. Define the list of items to iterate over
  const dataItems = [10, 20, 30];

  // 2. Instantiate the IteratorNode
  const iteratorNode = new IteratorNode();
  iteratorNode.setParams({
    items: dataItems,
    flow: processItemFlow // Pass the sub-flow instance directly
  });

  // 3. Define a node to collect results after iteration (optional, but good for demonstration)
  class CollectResultsNode extends AsyncNode {
    async execAsync(prepRes, execRes) {
      // execRes is now the shared object from the previous node (IteratorNode)
      // The actual results are in execRes.iteratorResult
      const collectedResults = execRes.iteratorResult;

      console.log('\n[MainFlow] All items processed. Collected results:');
      collectedResults.forEach((result, index) => {
        // dataItems is still out of scope here, so we'll just print the result
        console.log(`  Result ${index + 1}: ${result}`);
      });
      return collectedResults; // Return the actual array of results
    }
  }
  const collectResultsNode = new CollectResultsNode();

  // Chain the nodes
  iteratorNode.next(collectResultsNode);

  // 4. Create and run the main flow
  const mainFlow = new AsyncFlow(iteratorNode);

  try {
    const finalResults = await mainFlow.runAsync({});
    console.log('\n--- SubFlow and Iterator Example Finished ---');
    console.log('Final collected results from main flow:', finalResults);
  } catch (error) {
    console.error('\n--- SubFlow and Iterator Example Failed ---', error);
  }
})();
