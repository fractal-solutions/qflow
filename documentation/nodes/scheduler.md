## SchedulerNode

The `SchedulerNode` schedules qflow flows for future or recurring execution using cron syntax or a delay.

### Parameters

*   `action`: The action to perform: 'start' a new schedule or 'stop' an existing one.
*   `schedule`: Required for 'start'. A cron string (e.g., '0 3 * * *') or a number in milliseconds for a one-time delay.
*   `flow`: Required for 'start'. The name of the qflow AsyncFlow instance to trigger.
*   `flowParams`: Optional. Parameters (shared object) to pass to the triggered flow's runAsync.
*   `id`: Optional. A unique ID for the scheduled task (required for 'stop' action). If not provided for 'start', a random one will be generated.

### Example Usage

```javascript
import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { SchedulerNode, SystemNotificationNode } from '@fractal-solutions/qflow/nodes';

// --- Define a flow to be scheduled ---
class ScheduledTaskFlow extends AsyncNode {
  async execAsync(prepRes, shared) {
    const message = shared.message || 'Hello from a scheduled task!';
    console.log(`
[ScheduledTaskFlow] Executing: ${message} (Timestamp: ${new Date().toLocaleTimeString()})`);

    // Example: Send a system notification
    const notifyNode = new SystemNotificationNode();
    notifyNode.setParams({
      message: `Scheduled task executed: ${message}`,
      title: 'QFlow Scheduler Alert'
    });
    await new AsyncFlow(notifyNode).runAsync({});

    return { status: 'executed', message: message, timestamp: new Date().toISOString() };
  }
}

const myScheduledFlow = new AsyncFlow(new ScheduledTaskFlow());

// --- Main Flow: Schedule and manage tasks ---
(async () => {
  console.log('--- Running SchedulerNode Example ---');
  console.log("[Setup] Please ensure you have the 'node-cron' library installed (`npm install node-cron` or `bun add node-cron`).");

  // --- Example 1: Schedule a recurring task (every 10 seconds) ---
  console.log('\n--- Scheduling a recurring task (every 10 seconds) ---');
  const recurringTaskId = 'my-recurring-task';
  const scheduleRecurringNode = new SchedulerNode();
  scheduleRecurringNode.setParams({
    action: 'start',
    id: recurringTaskId,
    schedule: '*/10 * * * * *', // Every 10 seconds
    flow: myScheduledFlow,
    flowParams: { message: 'This is a recurring message!' }
  });

  try {
    const recurringResult = await new AsyncFlow(scheduleRecurringNode).runAsync({});
    console.log('Recurring task scheduled:', recurringResult);
  } catch (error) {
    console.error('Failed to schedule recurring task:', error.message);
  }

  // --- Example 2: Schedule a one-time task (in 5 seconds) ---
  console.log('\n--- Scheduling a one-time task (in 5 seconds) ---');
  const oneTimeTaskId = 'my-one-time-task';
  const scheduleOneTimeNode = new SchedulerNode();
  scheduleOneTimeNode.setParams({
    action: 'start',
    id: oneTimeTaskId,
    schedule: 5000, // 5000 milliseconds = 5 seconds
    flow: myScheduledFlow,
    flowParams: { message: 'This is a one-time message!' }
  });

  try {
    const oneTimeResult = await new AsyncFlow(scheduleOneTimeNode).runAsync({});
    console.log('One-time task scheduled:', oneTimeResult);
  } catch (error) {
    console.error('Failed to schedule one-time task:', error.message);
  }

  // --- Wait for a bit to see tasks execute ---
  console.log('\n--- Waiting for 25 seconds to observe scheduled tasks ---');
  await new Promise(resolve => setTimeout(resolve, 25000));

  // --- Example 3: Stop the recurring task ---
  console.log('\n--- Stopping the recurring task ---');
  const stopRecurringNode = new SchedulerNode();
  stopRecurringNode.setParams({
    action: 'stop',
    id: recurringTaskId
  });

  try {
    const stopResult = await new AsyncFlow(stopRecurringNode).runAsync({});
    console.log('Recurring task stop result:', stopResult);
  } catch (error) {
    console.error('Failed to stop recurring task:', error.message);
  }

  console.log('\n--- SchedulerNode Example Finished ---');
  console.log('Note: If the process exits, in-memory scheduled tasks will be lost.');
})();
```
