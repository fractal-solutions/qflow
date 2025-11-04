## SchedulerNode

The `SchedulerNode` schedules qflow flows for future or recurring execution using cron syntax or a delay.

### Parameters

*   `action`: The action to perform: 'start' a new schedule or 'stop' an existing one.
*   `schedule`: Required for 'start'. A cron string (e.g., '0 3 * * *') or a number in milliseconds for a one-time delay.
*   `flow`: Required for 'start'. The name of the qflow AsyncFlow instance to trigger.
*   `flowParams`: Optional. Parameters (shared object) to pass to the triggered flow's runAsync.
*   `id`: Optional. A unique ID for the scheduled task (required for 'stop' action). If not provided for 'start', a random one will be generated.
