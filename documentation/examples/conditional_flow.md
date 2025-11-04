### 3. Conditional Flow

Using `transition()` for dynamic branching based on an action. This example demonstrates configuring a node using `setParams` for a cleaner API.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

class ConditionalNode extends Node {
  exec() {
    // Access shouldGoLeft from this.params, which is set via setParams
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
conditionalNode.setParams({ shouldGoLeft: true }); // Configure via setParams

const leftNode = MessageNode('Went Left');
const rightNode = MessageNode('Went Right');

conditionalNode.next(leftNode, 'left');
conditionalNode.next(rightNode, 'right');

const conditionalFlow = new Flow(conditionalNode);
conditionalFlow.run({});
// Expected output:
// ConditionalNode: Going left
// Went Left

const conditionalNode2 = new ConditionalNode();
conditionalNode2.setParams({ shouldGoLeft: false }); // Configure via setParams

conditionalNode2.next(leftNode, 'left');
conditionalNode2.next(rightNode, 'right');
const conditionalFlow2 = new Flow(conditionalNode2);
conditionalFlow2.run({});
// Expected output:
// ConditionalNode: Going right
// Went Right
```