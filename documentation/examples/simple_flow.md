### 2. Simple Flow

Chaining multiple nodes together to form a basic workflow.

```javascript
import { Node, Flow } from '@fractal-solutions/qflow';

let count = 0;

class MessageNode extends Node {
    exec() {
        count++;
        console.log(`New Message ${count}`);
        return `default`;
    }
}

class TimeNode extends Node {
    exec() {
        console.log(`Time ${Date.now()}`);
        return `default`;
    }
}

const m1 = new MessageNode();
const t1 = new TimeNode();
const m2 = new MessageNode();

m1.next(t1);
t1.next(m2);

const flow = new Flow(m1);
flow.run({});
// Expected output (approximate):
// New Message 1
// Time <timestamp>
// New Message 2
```