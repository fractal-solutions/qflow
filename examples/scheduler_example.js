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
    // Cron syntax: A powerful way to define recurring schedules.
    // It consists of 5 or 6 fields, separated by spaces.
    //
    // Field Order (6 fields):
    // 1. Seconds (0-59) - Optional, used by node-cron
    // 2. Minutes (0-59)
    // 3. Hours (0-23)
    // 4. Day of Month (1-31)
    // 5. Month (1-12 or JAN-DEC)
    // 6. Day of Week (0-7 or SUN-SAT, 0 and 7 are Sunday)
    //
    // Special Characters:
    // *   : Any value
    // ,   : Value list separator (e.g., "MON,WED,FRI")
    // -   : Range of values (e.g., "9-17" for hours 9 through 17)
    // /   : Step values (e.g., "*/5" for every 5 units)
    // ?   : No specific value (used for Day of Month or Day of Week when the other is specified)
    // L   : Last day of month or last weekday (e.g., "last Friday")
    // W   : Weekday nearest to the given day (e.g., "15W" for nearest weekday to 15th)
    // #   : Nth day of the month (e.g., "3#2" for the second Tuesday of the month)
    //
    // Common Examples:
    // '*/10 * * * * *'  : Every 10 seconds
    // '0 * * * *'       : Every hour at the 0th minute (e.g., 1:00, 2:00, etc.)
    // '0 0 * * *'       : Every day at midnight (00:00)
    // '0 0 1 * *'       : The first day of every month at midnight
    // '0 0 * * 1'       : Every Monday at midnight
    // '0 9-17 * * 1-5'  : Every hour between 9 AM and 5 PM, Monday to Friday
    // '0 0 1 1 *'       : Every year on January 1st at midnight
    // '0 0 1-7 * 1'     : The first Monday of every month at midnight
    // '0 30 10 * * 1-5' : Every weekday (Mon-Fri) at 10:30 AM
    // '0 0 12 1 * ?'    : At 12:00 PM, on day 1 of the month, every month
    //
    // For more details and advanced usage, refer to the node-cron documentation:
    // https://www.npmjs.com/package/node-cron#cron-syntax
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