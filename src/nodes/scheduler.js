import { AsyncNode, AsyncFlow } from '../qflow.js';
// You would need to install the 'node-cron' library: npm install node-cron
import * as cron from 'node-cron';

export class SchedulerNode extends AsyncNode {
  // Static map to hold all active scheduled tasks
  static activeTasks = new Map();

  constructor(maxRetries = 1, wait = 0) {
    super(maxRetries, wait);
  }

  async execAsync() {
    const {
      schedule,
      flow,
      flowParams,
      action,
      id = `qflow_scheduled_task_${Math.random().toString(16).substr(2, 8)}` // Generate ID if not provided
    } = this.params;

    if (!action || !['start', 'stop'].includes(action)) {
      throw new Error('SchedulerNode requires an `action`: "start" or "stop".');
    }

    if (action === 'start') {
      if (!schedule) {
        throw new Error('SchedulerNode "start" action requires a `schedule`.');
      }
      // Flow can be an AsyncFlow instance or a string (name from flowRegistry)
      if (!flow) {
        throw new Error('SchedulerNode "start" action requires a `flow` parameter.');
      }

      // Stop any existing task with the same ID
      if (SchedulerNode.activeTasks.has(id)) {
        const existingTask = SchedulerNode.activeTasks.get(id);
        existingTask.stop();
        SchedulerNode.activeTasks.delete(id);
        console.log(`[SchedulerNode] Stopped existing task with ID: ${id}`);
      }

      let task;
      if (typeof schedule === 'string') { // Cron string
        task = cron.schedule(schedule, async () => {
          console.log(`[SchedulerNode] Scheduled cron task triggered for ID: ${id}`);
          try {
            // If flow is a string, assume it's a flow name from a global registry
            // This would require the SchedulerNode to have access to the flowRegistry
            // For now, assume 'flow' is an AsyncFlow instance directly passed.
            const flowInstance = flow; // Assuming flow is an AsyncFlow instance
            const taskShared = { ...flowParams };
            const result = await flowInstance.runAsync(taskShared);
            console.log(`[SchedulerNode] Scheduled flow (ID: ${id}) completed successfully. Result:`, result);
          } catch (e) {
            console.error(`[SchedulerNode] Scheduled flow (ID: ${id}) failed:`, e);
          }
        }, {
          scheduled: true,
          timezone: 'America/New_York' // Example timezone
        });
        console.log(`[SchedulerNode] Started cron job (ID: ${id}) with schedule: ${schedule}`);
        SchedulerNode.activeTasks.set(id, task);
        return { status: 'scheduled', type: 'cron', schedule: schedule, id: id };
      } else if (typeof schedule === 'number') { // Milliseconds for setTimeout
        const timerId = setTimeout(async () => {
          console.log(`[SchedulerNode] Scheduled one-time task triggered for ID: ${id}`);
          try {
            const flowInstance = flow; // Assuming flow is an AsyncFlow instance
            const taskShared = { ...flowParams };
            const result = await flowInstance.runAsync(taskShared);
            console.log(`[SchedulerNode] Scheduled flow (ID: ${id}) completed successfully. Result:`, result);
          } catch (e) {
            console.error(`[SchedulerNode] Scheduled flow (ID: ${id}) failed:`, e);
          } finally {
            SchedulerNode.activeTasks.delete(id); // Remove one-time task after execution
          }
        }, schedule);
        task = { id: id, stop: () => clearTimeout(timerId) }; // Simple wrapper for setTimeout
        console.log(`[SchedulerNode] Started one-time task (ID: ${id}) in ${schedule}ms`);
        SchedulerNode.activeTasks.set(id, task);
        return { status: 'scheduled', type: 'timeout', schedule: schedule, id: id };
      } else {
        throw new Error('Invalid schedule type. Must be a cron string or a number (milliseconds).');
      }
    } else if (action === 'stop') {
      if (!id) {
        throw new Error('SchedulerNode "stop" action requires an `id` to identify the task to stop.');
      }
      if (SchedulerNode.activeTasks.has(id)) {
        const taskToStop = SchedulerNode.activeTasks.get(id);
        taskToStop.stop();
        SchedulerNode.activeTasks.delete(id);
        console.log(`[SchedulerNode] Stopped task with ID: ${id}`);
        return { status: 'stopped', id: id };
      } else {
        console.warn(`[SchedulerNode] No active task found with ID: ${id}`);
        return { status: 'not_found', id: id };
      }
    }
  }

  // No postAsync cleanup needed here, as tasks are managed statically.
  // Process exit will clear static map.
}
