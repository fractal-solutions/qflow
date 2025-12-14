import { AsyncNode, AsyncFlow } from '../qflow.js';
// You would need to install the 'node-cron' library: npm install node-cron
import * as cron from 'node-cron';
import { log } from '../logger.js';

export class SchedulerNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "scheduler",
      description: "Schedules qflow flows for future or recurring execution using cron syntax or a delay.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["start", "stop"],
            description: "The action to perform: 'start' a new schedule or 'stop' an existing one."
          },
          schedule: {
            type: ["string", "number"],
            description: "Required for 'start'. A cron string (e.g., '0 3 * * *') or a number in milliseconds for a one-time delay."
          },
          flow: {
            type: "string", // This will be the name of a flow in the flowRegistry
            description: "Required for 'start'. The name of the qflow AsyncFlow instance to trigger."
          },
          flowParams: {
            type: "object",
            description: "Optional. Parameters (shared object) to pass to the triggered flow's runAsync."
          },
          id: {
            type: "string",
            description: "Optional. A unique ID for the scheduled task (required for 'stop' action). If not provided for 'start', a random one will be generated."
          }
        },
        required: ["action"]
      }
    };
  }

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
        log(`[SchedulerNode] Stopped existing task with ID: ${id}`, this.params.logging);
      }

      let task;
      if (typeof schedule === 'string') { // Cron string
        task = cron.schedule(schedule, async () => {
          log(`[SchedulerNode] Scheduled cron task triggered for ID: ${id}`, this.params.logging);
          try {
            // If flow is a string, assume it's a flow name from a global registry
            // This would require the SchedulerNode to have access to the flowRegistry
            // For now, assume 'flow' is an AsyncFlow instance directly passed.
            const flowInstance = flow; // Assuming flow is an AsyncFlow instance
            const taskShared = { ...flowParams };
            const result = await flowInstance.runAsync(taskShared);
            log(`[SchedulerNode] Scheduled flow (ID: ${id}) completed successfully. Result: ${JSON.stringify(result)}`, this.params.logging);
          } catch (e) {
            log(`[SchedulerNode] Scheduled flow (ID: ${id}) failed: ${e.message}`, this.params.logging, { type: 'error' });
          }
        }, {
          scheduled: true,
          timezone: 'America/New_York' // Example timezone
        });
        log(`[SchedulerNode] Started cron job (ID: ${id}) with schedule: ${schedule}`, this.params.logging);
        SchedulerNode.activeTasks.set(id, task);
        return { status: 'scheduled', type: 'cron', schedule: schedule, id: id };
      } else if (typeof schedule === 'number') { // Milliseconds for setTimeout
        const timerId = setTimeout(async () => {
          log(`[SchedulerNode] Scheduled one-time task triggered for ID: ${id}`, this.params.logging);
          try {
            const flowInstance = flow; // Assuming flow is an AsyncFlow instance
            const taskShared = { ...flowParams };
            const result = await flowInstance.runAsync(taskShared);
            log(`[SchedulerNode] Scheduled flow (ID: ${id}) completed successfully. Result: ${JSON.stringify(result)}`, this.params.logging);
          } catch (e) {
            log(`[SchedulerNode] Scheduled flow (ID: ${id}) failed: ${e.message}`, this.params.logging, { type: 'error' });
          } finally {
            SchedulerNode.activeTasks.delete(id); // Remove one-time task after execution
          }
        }, schedule);
        task = { id: id, stop: () => clearTimeout(timerId) }; // Simple wrapper for setTimeout
        log(`[SchedulerNode] Started one-time task (ID: ${id}) in ${schedule}ms`, this.params.logging);
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
        log(`[SchedulerNode] Stopped task with ID: ${id}`, this.params.logging);
        return { status: 'stopped', id: id };
      } else {
        log(`[SchedulerNode] No active task found with ID: ${id}`, this.params.logging, { type: 'warn' });
        return { status: 'not_found', id: id };
      }
    }
  }

  // No postAsync cleanup needed here, as tasks are managed statically.
  // Process exit will clear static map.
}
