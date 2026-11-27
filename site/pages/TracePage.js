/** @jsx React.createElement */
window.TracePage = () => {
    const CodeBlock = window.CodeBlock;

    const SAMPLE_TRACE = {
        schema: 'qflow.trace/v1',
        runId: 'run_demo_support_triage',
        flowName: 'SupportTriage',
        status: 'completed',
        startedAt: 1732000000000,
        endedAt: 1732000001290,
        steps: 3,
        events: [
            { event: 'run:start', runId: 'run_demo_support_triage', flowName: 'SupportTriage', status: 'running', createdAt: 1732000000000 },
            { event: 'flow:start', payload: { flowId: 'flow_demo_1', startTime: 1732000000010 } },
            { event: 'node:start', payload: { flowId: 'flow_demo_1', nodeClass: 'ClassifyNode', startTime: 1732000000030, params: { model: 'gpt-4o-mini' } } },
            { event: 'llm:delta', payload: { delta: 'This looks like a billing', text: 'This looks like a billing' } },
            { event: 'llm:delta', payload: { delta: ' question.', text: 'This looks like a billing question.' } },
            { event: 'llm:done', payload: { text: 'This looks like a billing question.' } },
            { event: 'node:end', payload: { flowId: 'flow_demo_1', nodeClass: 'ClassifyNode', endTime: 1732000000300, duration: 270, status: 'success', result: { category: 'billing' } } },
            { event: 'checkpoint:saved', payload: { step: 1, nodeClass: 'ClassifyNode', action: 'default', nextNodeIndex: 1 } },
            { event: 'node:start', payload: { flowId: 'flow_demo_1', nodeClass: 'ReplyNode', startTime: 1732000000320, params: { tone: 'friendly' } } },
            { event: 'node:end', payload: { flowId: 'flow_demo_1', nodeClass: 'ReplyNode', endTime: 1732000000980, duration: 660, status: 'success', result: { reply: 'I can help with that refund.' } } },
            { event: 'checkpoint:saved', payload: { step: 2, nodeClass: 'ReplyNode', action: 'default', nextNodeIndex: 2 } },
            { event: 'node:start', payload: { flowId: 'flow_demo_1', nodeClass: 'SendReplyNode', startTime: 1732000001000 } },
            { event: 'node:end', payload: { flowId: 'flow_demo_1', nodeClass: 'SendReplyNode', endTime: 1732000001240, duration: 240, status: 'success', result: { sent: true } } },
            { event: 'checkpoint:saved', payload: { step: 3, nodeClass: 'SendReplyNode', action: 'default', nextNodeIndex: null } },
            { event: 'flow:end', payload: { flowId: 'flow_demo_1', endTime: 1732000001270, duration: 1260, status: 'success' } },
            { event: 'run:end', runId: 'run_demo_support_triage', status: 'completed', step: 3, updatedAt: 1732000001290 }
        ],
        checkpoints: [
            { step: 1, nodeClass: 'ClassifyNode', action: 'default', nextNodeIndex: 1 },
            { step: 2, nodeClass: 'ReplyNode', action: 'default', nextNodeIndex: 2 },
            { step: 3, nodeClass: 'SendReplyNode', action: 'default', nextNodeIndex: null }
        ]
    };

    const STORAGE_KEY = 'qflow.trace';

    const pick = (obj, keys, fallback) => {
        for (let i = 0; i < keys.length; i += 1) {
            if (obj && obj[keys[i]] !== undefined && obj[keys[i]] !== null) return obj[keys[i]];
        }
        return fallback;
    };

    const clone = (value) => {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return String(value);
        }
    };

    const toNumber = (value) => {
        if (typeof value === 'number') return isNaN(value) ? null : value;
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    };

    const normalizeEvent = (entry, index) => {
        if (typeof entry === 'string') return { seq: index, event: entry };
        if (!entry || typeof entry !== 'object') return { seq: index, event: 'log', message: String(entry) };

        const eventName = entry.event || entry.type || 'custom';
        const payload = entry.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload)
            ? clone(entry.payload)
            : null;
        const topLevel = {};
        Object.keys(entry).forEach((key) => {
            if (key !== 'event' && key !== 'type' && key !== 'payload') topLevel[key] = clone(entry[key]);
        });

        if (payload) return Object.assign({ seq: index, event: eventName }, topLevel, payload);
        return Object.assign(
            { seq: index, event: eventName },
            topLevel,
            entry.payload !== undefined ? { message: clone(entry.payload) } : {}
        );
    };

    const buildSpans = (events) => {
        const open = {};
        const spans = [];

        const keyFor = (event) => {
            if (event.nodeClass) return 'node:' + (event.flowId || event.runId || '') + ':' + event.nodeClass;
            if (String(event.event).indexOf('flow:') === 0) return 'flow:' + (event.flowId || '');
            return 'run:' + (event.runId || '');
        };

        events.forEach((event) => {
            const name = event.event || '';
            if (name === 'node:start' || name === 'flow:start' || name === 'run:start') {
                open[keyFor(event)] = {
                    seq: event.seq,
                    kind: name.split(':')[0],
                    label: event.nodeClass || event.flowName || event.runId || name,
                    startTime: pick(event, ['startTime', 'createdAt', 'timestamp'], null),
                    endTime: null,
                    duration: null,
                    status: 'running'
                };
                return;
            }
            if (name !== 'node:end' && name !== 'flow:end' && name !== 'run:end') return;

            const key = keyFor(event);
            const kind = name.split(':')[0];
            let span = open[key];
            if (!span) {
                const keys = Object.keys(open);
                for (let i = keys.length - 1; i >= 0; i -= 1) {
                    if (keys[i].indexOf(kind) === 0) {
                        span = open[keys[i]];
                        delete open[keys[i]];
                        break;
                    }
                }
            } else {
                delete open[key];
            }

            const record = {
                seq: event.seq,
                kind: kind,
                label: event.nodeClass || event.flowName || event.runId || name,
                startTime: span ? span.startTime : pick(event, ['startTime', 'createdAt', 'timestamp'], null),
                endTime: pick(event, ['endTime', 'updatedAt', 'timestamp'], null),
                duration: event.duration !== undefined ? event.duration : null,
                status: event.status || (event.error ? 'error' : 'instant'),
                error: event.error || null,
                step: event.step || null
            };
            if (span) {
                record.status = event.status || (event.error ? 'error' : 'success');
                record.error = event.error || null;
                if (record.duration === null && record.startTime !== null && record.endTime !== null) {
                    record.duration = toNumber(record.endTime) - toNumber(record.startTime);
                }
                if (event.nodeClass) record.label = event.nodeClass;
            }
            spans.push(record);
        });

        Object.keys(open).forEach((key) => {
            open[key].status = 'open';
            spans.push(open[key]);
        });
        return spans.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    };

    const normalizeTrace = (input) => {
        const source = Array.isArray(input) ? { events: input } : (input && typeof input === 'object' ? input : {});
        const rawEvents = source.events || source.trace || source.entries || [];
        const events = (Array.isArray(rawEvents) ? rawEvents : []).map(normalizeEvent);
        const checkpoints = Array.isArray(source.checkpoints) ? source.checkpoints.map(clone) : [];
        const reverse = events.slice().reverse();
        const terminal = reverse.filter((event) => event.event === 'run:end' || event.event === 'flow:end')[0];
        const status = source.status || (terminal && terminal.status) ||
            (events.some((event) => event.event === 'run:start' || event.event === 'flow:start') ? 'running' : 'unknown');
        const firstTimeEvent = events.filter((event) => pick(event, ['startTime', 'createdAt', 'timestamp'], null) !== null)[0];
        const lastTimeEvent = reverse.filter((event) => pick(event, ['endTime', 'updatedAt', 'timestamp'], null) !== null)[0];

        return {
            schema: 'qflow.trace/v1',
            runId: source.runId || pick(terminal || {}, ['runId'], null),
            flowName: source.flowName || pick(terminal || {}, ['flowName'], null),
            status: status,
            steps: source.steps || checkpoints.length || events.filter((event) => event.event === 'node:end').length || null,
            startedAt: source.startedAt || source.createdAt || (firstTimeEvent ? pick(firstTimeEvent, ['startTime', 'createdAt', 'timestamp'], null) : null),
            endedAt: source.endedAt || source.updatedAt || (lastTimeEvent ? pick(lastTimeEvent, ['endTime', 'updatedAt', 'timestamp'], null) : null),
            events: events,
            checkpoints: checkpoints,
            spans: buildSpans(events)
        };
    };

    const toneFor = (name) => {
        if (String(name).indexOf('node:') === 0) return { bg: 'rgba(45,212,191,0.14)', fg: '#5eead4' };
        if (String(name).indexOf('flow:') === 0 || String(name).indexOf('run:') === 0) return { bg: 'rgba(129,140,248,0.16)', fg: '#a5b4fc' };
        if (String(name).indexOf('checkpoint:') === 0) return { bg: 'rgba(251,191,36,0.14)', fg: '#fcd34d' };
        if (String(name).indexOf('llm:') === 0) return { bg: 'rgba(244,114,182,0.14)', fg: '#f9a8d4' };
        return { bg: 'rgba(148,163,184,0.14)', fg: '#cbd5e1' };
    };

    const statusColor = (status) => {
        if (status === 'completed' || status === 'success') return '#34d399';
        if (status === 'failed' || status === 'error') return '#fb7185';
        if (status === 'running') return '#fbbf24';
        return '#94a3b8';
    };

    const [trace, setTrace] = React.useState(() => normalizeTrace(SAMPLE_TRACE));
    const [rawText, setRawText] = React.useState(JSON.stringify(SAMPLE_TRACE, null, 2));
    const [query, setQuery] = React.useState('');
    const [selectedIndex, setSelectedIndex] = React.useState(6);
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('Sample trace loaded. Paste your own JSON to explore it.');

    const loadText = (text) => {
        setRawText(text);
        try {
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (parseError) {
                const lines = text.split(/\r?\n/).filter((line) => line.trim());
                if (!lines.length) throw parseError;
                parsed = lines.map((line) => JSON.parse(line));
            }
            const nextTrace = normalizeTrace(parsed);
            setTrace(nextTrace);
            setSelectedIndex(0);
            setError('');
            setNotice('Loaded ' + nextTrace.events.length + ' events' + (nextTrace.runId ? ' for ' + nextTrace.runId : '') + '.');
            try {
                localStorage.setItem(STORAGE_KEY, text);
            } catch (storageError) {
                // Storage is best-effort.
            }
        } catch (loadError) {
            setError('Could not parse trace: ' + loadError.message);
            setNotice('');
        }
    };

    const handleFile = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => loadText(String(reader.result));
        reader.readAsText(file);
    };

    const loadSaved = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                setError('No saved trace found in this browser.');
                return;
            }
            loadText(saved);
        } catch (savedError) {
            setError('Could not read saved trace: ' + savedError.message);
        }
    };

    const downloadTrace = () => {
        const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = (trace.runId || 'qflow-trace') + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const filteredEvents = trace.events.filter((event) =>
        String(event.event).toLowerCase().indexOf(query.toLowerCase()) !== -1
    );
    const selectedEvent = trace.events[selectedIndex] || filteredEvents[0] || null;

    const timelineMin = trace.spans.reduce((min, span) => {
        const value = toNumber(span.startTime);
        return value !== null && (min === null || value < min) ? value : min;
    }, null);
    const timelineMax = trace.spans.reduce((max, span) => {
        const value = toNumber(span.endTime) || toNumber(span.startTime);
        return value !== null && (max === null || value > max) ? value : max;
    }, null);
    const timelineSpan = timelineMin !== null && timelineMax !== null && timelineMax > timelineMin
        ? timelineMax - timelineMin
        : Math.max(trace.events.length, 1);

    const positionFor = (span) => {
        const start = toNumber(span.startTime);
        const end = toNumber(span.endTime);
        const seqStart = span.seq || 0;
        const left = start !== null && timelineMin !== null
            ? ((start - timelineMin) / timelineSpan) * 100
            : (seqStart / Math.max(trace.events.length, 1)) * 100;
        const width = start !== null && end !== null
            ? Math.max(1.5, ((end - start) / timelineSpan) * 100)
            : 2;
        return { left: Math.max(0, Math.min(left, 98)), width: Math.min(width, 100 - Math.max(0, left)) };
    };

    const totalDuration = (() => {
        const start = toNumber(trace.startedAt);
        const end = toNumber(trace.endedAt);
        if (start !== null && end !== null && end >= start) return (end - start).toFixed(0) + ' ms';
        const durations = trace.spans.map((span) => span.duration).filter((value) => typeof value === 'number' && isFinite(value));
        if (durations.length) return durations.reduce((sum, value) => sum + value, 0).toFixed(0) + ' ms';
        return '—';
    })();

    const usageCode = `import { recordFlow } from '@fractal-solutions/qflow/testing';
import { writeTraceFile } from '@fractal-solutions/qflow/trace';

const recorder = recordFlow(flow);
await flow.runAsync(shared);

await writeTraceFile(recorder.events, './trace.json');
// Paste trace.json into this viewer.`;

    const durableCode = `import { recordFlow } from '@fractal-solutions/qflow/testing';
import { DurableFlow, SQLiteCheckpointer, createRunTrace } from '@fractal-solutions/qflow/durable';
import { writeTraceFile } from '@fractal-solutions/qflow/trace';

const checkpointer = new SQLiteCheckpointer('./runs.db');
const flow = new DurableFlow(startNode, { checkpointer, version: '1.0.0' });
const recorder = recordFlow(flow);

const runId = 'run-' + Date.now();
await flow.runDurable({ runId, shared: {} });

const trace = createRunTrace(checkpointer, runId, {
  events: recorder.events,
  includeState: true,
});
await writeTraceFile(trace, './runs/' + runId + '.json');`;

    return (
        <div className="container mx-auto px-4 sm:px-6 py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Developer tools</p>
                    <h1 className="mt-2 text-4xl font-display text-ink">Trace Viewer</h1>
                    <p className="mt-3 text-muted max-w-2xl">
                        Inspect flow events, node spans, token deltas, checkpoints, and payloads from a qflow 2.0.0 run.
                        Everything stays in your browser — paste JSON, upload a trace file, or reload your last trace.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => loadText(JSON.stringify(SAMPLE_TRACE, null, 2))} className="px-4 py-2 rounded-full border border-slate-300 text-sm font-semibold text-ink hover:bg-white/60 transition-colors">
                        Load sample
                    </button>
                    <button onClick={loadSaved} className="px-4 py-2 rounded-full border border-slate-300 text-sm font-semibold text-ink hover:bg-white/60 transition-colors">
                        Load saved
                    </button>
                    <button onClick={downloadTrace} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-colors">
                        Download JSON
                    </button>
                </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="glass rounded-2xl p-5 shadow-soft min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-display text-ink">Trace input</h2>
                        <label className="px-3 py-1.5 rounded-full border border-slate-300 text-xs font-semibold text-ink cursor-pointer hover:bg-white/60 transition-colors">
                            Upload .json
                            <input type="file" accept="application/json,.json,.jsonl" className="hidden" onChange={handleFile} />
                        </label>
                    </div>
                    <textarea
                        value={rawText}
                        onChange={(event) => setRawText(event.target.value)}
                        spellCheck={false}
                        className="mt-4 w-full h-80 rounded-xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400/60"
                        placeholder="Paste a qflow trace JSON object or newline-delimited events"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button onClick={() => loadText(rawText)} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-semibold shadow-soft hover:opacity-90 transition-colors">
                            Visualize trace
                        </button>
                        <button onClick={() => { setRawText(''); setTrace(normalizeTrace([])); setError(''); setNotice('Cleared.'); }} className="px-4 py-2 rounded-full border border-slate-300 text-sm font-semibold text-ink hover:bg-white/60 transition-colors">
                            Clear
                        </button>
                    </div>
                    {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
                    {!error && notice && <p className="mt-3 text-xs text-muted">{notice}</p>}
                </div>

                <div className="glass rounded-2xl p-5 shadow-soft min-w-0">
                    <h2 className="text-lg font-display text-ink">Run summary</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Status</p>
                            <p className="mt-1 text-sm font-semibold" style={{ color: statusColor(trace.status) }}>{trace.status || 'unknown'}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Steps</p>
                            <p className="mt-1 text-sm font-semibold text-ink">{trace.steps === null ? '—' : trace.steps}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Duration</p>
                            <p className="mt-1 text-sm font-semibold text-ink">{totalDuration}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 col-span-2 sm:col-span-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted">Flow / run</p>
                            <p className="mt-1 text-sm font-semibold text-ink break-words">{trace.flowName || 'Unnamed flow'}{trace.runId ? ' · ' + trace.runId : ''}</p>
                        </div>
                    </div>

                    <h3 className="mt-6 text-sm font-semibold text-ink">Timeline</h3>
                    {trace.spans.length === 0 ? (
                        <p className="mt-3 text-sm text-muted">No spans yet. Load a trace with node or flow lifecycle events.</p>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {trace.spans.map((span, index) => {
                                const pos = positionFor(span);
                                const color = statusColor(span.status);
                                return (
                                    <div key={index} className="grid grid-cols-[minmax(90px,0.8fr)_minmax(0,2fr)_64px] items-center gap-3">
                                        <p className="text-xs text-ink truncate">{span.label}</p>
                                        <div className="relative h-5 rounded-full bg-white/5 overflow-hidden">
                                            <div className="absolute inset-y-1 rounded-full" style={{ left: pos.left + '%', width: pos.width + '%', backgroundColor: color, opacity: 0.85 }} />
                                        </div>
                                        <p className="text-right text-[10px] text-muted">{span.duration === null ? span.status : span.duration + 'ms'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="glass rounded-2xl p-5 shadow-soft min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-display text-ink">Event stream</h2>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Filter events…"
                            className="w-48 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink outline-none focus:ring-2 focus:ring-emerald-400/60"
                        />
                    </div>
                    <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {filteredEvents.length === 0 ? (
                            <p className="text-sm text-muted">No events match this filter.</p>
                        ) : filteredEvents.map((event) => {
                            const tone = toneFor(event.event);
                            const index = trace.events.indexOf(event);
                            return (
                                <button
                                    key={event.seq}
                                    onClick={() => setSelectedIndex(index)}
                                    className={'w-full text-left rounded-xl border px-3 py-2 transition-colors ' + (index === selectedIndex ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10')}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ backgroundColor: tone.bg, color: tone.fg }}>{event.event}</span>
                                        <span className="text-[10px] text-muted">#{event.seq + 1}</span>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-ink">
                                        {event.nodeClass || event.flowName || event.delta || event.message || event.step !== undefined ? (
                                            event.nodeClass || event.flowName || event.delta || event.message || 'step ' + event.step
                                        ) : '—'}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="glass rounded-2xl p-5 shadow-soft min-w-0">
                    <h2 className="text-lg font-display text-ink">Payload inspector</h2>
                    {selectedEvent ? (
                        <>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ backgroundColor: toneFor(selectedEvent.event).bg, color: toneFor(selectedEvent.event).fg }}>{selectedEvent.event}</span>
                                {selectedEvent.status && <span className="text-xs text-muted">status: {selectedEvent.status}</span>}
                            </div>
                            <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-slate-950/70 p-4 font-mono text-[11px] leading-relaxed text-slate-100">
                                {JSON.stringify(selectedEvent, null, 2)}
                            </pre>
                        </>
                    ) : (
                        <p className="mt-4 text-sm text-muted">Select an event to inspect its payload.</p>
                    )}
                </div>
            </div>

            {trace.checkpoints.length > 0 && (
                <div className="glass mt-6 rounded-2xl p-5 shadow-soft overflow-hidden">
                    <h2 className="text-lg font-display text-ink">Checkpoints</h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-muted">
                                <tr>
                                    <th className="pb-2 pr-4">Step</th>
                                    <th className="pb-2 pr-4">Node</th>
                                    <th className="pb-2 pr-4">Action</th>
                                    <th className="pb-2">Next index</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trace.checkpoints.map((checkpoint, index) => (
                                    <tr key={index} className="border-t border-white/10 text-ink">
                                        <td className="py-2 pr-4">{checkpoint.step}</td>
                                        <td className="py-2 pr-4">{checkpoint.nodeClass || '—'}</td>
                                        <td className="py-2 pr-4">{checkpoint.action || '—'}</td>
                                        <td className="py-2">{checkpoint.nextNodeIndex === null || checkpoint.nextNodeIndex === undefined ? 'end' : checkpoint.nextNodeIndex}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <CodeBlock code={usageCode} title="Capture a trace" language="js" />
                <CodeBlock code={durableCode} title="Export a durable run" language="js" />
            </div>
        </div>
    );
};
