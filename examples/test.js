import { Node, Flow } from '../src/qflow.js'
let count = 0;
let count2 = 0;

class MessageNode extends Node {
    exec() {
        count++;
        console.log(`New Message ${count}`);
        return `default`;
    }
}

const m1 = new MessageNode();
const m2 = new MessageNode();

class TimeNode extends Node {
    exec() {
        count2++;
        console.log(`Time ${Date.now()}`);
        return `default`;
    }
}

const t1 = new TimeNode();

m1.next(t1);
t1.next(m2);
const flow = new Flow(m1);


flow.run({});