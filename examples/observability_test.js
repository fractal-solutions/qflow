import { AsyncFlow, AsyncNode } from '../src/qflow.js';

const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    grey: "\x1b[90m"
};
function colorize(text, color) {
    return `${color}${text}${colors.reset}`;
}

// --- A simple node that simulates some work ---
class WorkNode extends AsyncNode {
    async execAsync() {
        const workTime = Math.random() * 100 + 50; // 50-150ms
        await new Promise(resolve => setTimeout(resolve, workTime));
        return { status: 'work_done' };
    }
}

// --- A node that is designed to fail once before succeeding ---
let failCount = 0;
class SometimesFailsNode extends AsyncNode {
    constructor() {
        // Configure this node to allow 1 retry (for a total of 2 attempts)
        super(2, 0.1); 
    }
    async execAsync() {
        if (failCount < 1) {
            failCount++;
            console.log(colorize(`    [SometimesFailsNode] Attempt ${failCount}: Simulating a failure...`, colors.red));
            throw new Error('Simulating a transient error');
        }
        console.log(colorize(`    [SometimesFailsNode] Attempt ${failCount + 1}: Succeeded after retry.`, colors.green));
        return { status: 'succeeded_after_failure' };
    }
}

// --- Main Example ---
(async () => {
    console.log('--- Running Observability Event System Example ---');

    // 1. Define the workflow
    const startNode = new WorkNode();
    const middleNode = new SometimesFailsNode();
    const endNode = new WorkNode();

    startNode.next(middleNode)
    	.next(endNode);

    // 2. Create the flow
    const myFlow = new AsyncFlow(startNode);

    // 3. Attach listeners for observability
    myFlow.on('flow:start', (payload) => {
        const time = new Date(payload.startTime).toLocaleTimeString();
        console.log(`\n${colorize(`[FLOW:START]`, colors.cyan)} ${payload.flowId} at ${time}`);
    });

    myFlow.on('node:start', (payload) => {
        console.log(colorize(`  [NODE:START] ${payload.nodeClass}`, colors.grey));
    });

    myFlow.on('node:retry', (payload) => {
        console.log(`${colorize(`    [NODE:RETRY] ${payload.nodeClass} | Attempt ${payload.attempt}/${payload.maxRetries} | Error: ${payload.error.message}`, colors.yellow)}`);
    });

    myFlow.on('node:end', (payload) => {
        const status = payload.status.toUpperCase();
        const color = payload.status === 'success' ? colors.green : colors.red;
        const statusStr = colorize(status.padEnd(7), color); // Pad for alignment
        const duration = `${payload.duration.toFixed(2)}ms`.padStart(10);
        console.log(`  [NODE:END]   ${payload.nodeClass.padEnd(18)} | Status: ${statusStr} | Duration: ${duration}`);
        if (payload.error) {
            console.log(colorize(`    └─ FINAL ERROR: ${payload.error.message}`, colors.red));
        }
    });

    myFlow.on('flow:end', (payload) => {
        const status = payload.status.toUpperCase();
        const color = payload.status === 'success' ? colors.green : colors.red;
        const statusStr = colorize(status.padEnd(7), color);
        const duration = `${payload.duration.toFixed(2)}ms`;
        console.log(`\n${colorize(`[FLOW:END]`, colors.cyan)}   ${payload.flowId} | Status: ${statusStr} | Total Duration: ${duration}`);
        if (payload.error) {
            console.error(colorize(`  └─ FLOW ERROR: ${payload.error.message}`, colors.red));
        }
    });

    // 4. Run the flow
    try {
        await myFlow.runAsync({});
        console.log('\nFlow completed successfully.');
    } catch (e) {
        // This block will be hit if the flow fails completely (e.g., if retries are exhausted)
        console.log('\nMain catch block: The flow execution failed.');
    }

})();
