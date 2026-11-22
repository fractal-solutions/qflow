import { AsyncNode } from './qflow.js';
import { SchedulePendingError, stableHash } from './util.js';

export { SchedulePendingError };

function parseCronField(field, min, max) {
  const values = new Set();
  for (const part of String(field).split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart == null ? 1 : Number(stepPart);
    if (!Number.isFinite(step) || step < 1) throw new Error(`Invalid cron step '${stepPart}'.`);

    let start;
    let end;
    if (rangePart === '*') {
      start = min;
      end = max;
    } else if (rangePart.includes('-')) {
      const [from, to] = rangePart.split('-');
      start = Number(from);
      end = Number(to);
    } else {
      start = Number(rangePart);
      end = stepPart == null ? start : max;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      throw new Error(`Invalid cron field '${field}'.`);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return values;
}

/** Next epoch-ms matching a standard five-field cron expression. */
export function nextCronTime(expression, from = new Date()) {
  const fields = String(expression ?? '').trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Cron expression must have 5 fields: 'minute hour day month weekday'.");

  const minutes = parseCronField(fields[0], 0, 59);
  const hours = parseCronField(fields[1], 0, 23);
  const days = parseCronField(fields[2], 1, 31);
  const months = parseCronField(fields[3], 1, 12);
  const weekdays = new Set([...parseCronField(fields[4], 0, 7)].map(value => value % 7));

  const dayRestricted = fields[2] !== '*';
  const weekdayRestricted = fields[4] !== '*';
  const cursor = new Date(from instanceof Date ? from.getTime() : Number(from));
  if (Number.isNaN(cursor.getTime())) throw new Error('nextCronTime requires a valid start date.');
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = cursor.getTime() + 366 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= limit) {
    if (!months.has(cursor.getMonth() + 1)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    const dayMatches = dayRestricted && weekdayRestricted
      ? days.has(cursor.getDate()) || weekdays.has(cursor.getDay())
      : dayRestricted
        ? days.has(cursor.getDate())
        : weekdayRestricted
          ? weekdays.has(cursor.getDay())
          : true;
    if (!dayMatches) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    if (!hours.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!minutes.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
      continue;
    }
    return cursor.getTime();
  }
  throw new Error(`No future time matches cron '${expression}'.`);
}

/**
 * Suspend a durable run until a due time. On first execution it persists the
 * resolved due time into `shared`; on resume it re-checks that same time.
 *
 * Use `checkpointer.listScheduledRuns()` to discover suspended runs whose
 * `dueAt` has passed, then call `flow.runDurable({ runId, resume: true })`.
 */
export class ScheduleNode extends AsyncNode {
  constructor({
    at = null,
    delayMs = null,
    cron = null,
    scheduleId = null,
    dueAtKey = 'scheduledAt',
    scheduleIdKey = 'scheduleId',
    resultKey = 'scheduleResult',
  } = {}) {
    super();
    this.at = at;
    this.delayMs = delayMs;
    this.cron = cron;
    this.scheduleId = scheduleId;
    this.dueAtKey = dueAtKey;
    this.scheduleIdKey = scheduleIdKey;
    this.resultKey = resultKey;
  }

  async prepAsync(shared = {}) {
    const at = this.params.at ?? this.at ?? shared[this.dueAtKey];
    let dueAt = null;
    if (at != null) {
      dueAt = at instanceof Date ? at.getTime() : Number(new Date(at));
      if (Number.isNaN(dueAt)) dueAt = Number(at);
    } else if (this.params.delayMs ?? this.delayMs) {
      dueAt = Date.now() + Number(this.params.delayMs ?? this.delayMs);
    } else if (this.params.cron ?? this.cron) {
      dueAt = nextCronTime(this.params.cron ?? this.cron, new Date());
    }
    if (!Number.isFinite(dueAt)) throw new Error('ScheduleNode requires at, delayMs or cron (or a saved scheduledAt).');

    const key = this.params.dueAtKey ?? this.dueAtKey;
    shared[key] = dueAt;

    const id = this.params.scheduleId ?? this.scheduleId ?? shared[this.scheduleIdKey]
      ?? `schedule:${stableHash({ dueAt, node: this.constructor.name })}`;
    shared[this.scheduleIdKey] = id;
    return { dueAt, scheduleId: id, shared };
  }

  async execAsync(prepRes, _shared = {}, observer = {}) {
    const now = this.params.now instanceof Date
      ? this.params.now.getTime()
      : this.params.now ?? Date.now();
    if (now < prepRes.dueAt) {
      observer.emit?.('schedule:waiting', {
        scheduleId: prepRes.scheduleId,
        dueAt: prepRes.dueAt,
        runId: observer.runId,
      });
      throw new SchedulePendingError(prepRes.scheduleId, {
        runId: observer.runId,
        dueAt: prepRes.dueAt,
        step: observer.step ?? null,
      });
    }
    return {
      scheduleId: prepRes.scheduleId,
      dueAt: prepRes.dueAt,
      firedAt: now,
    };
  }

  async postAsync(shared, _prepRes, execRes) {
    shared[this.resultKey] = execRes;
    return Object.keys(this.successors).length ? 'due' : execRes;
  }
}
