/**
 * WHY THIS EXISTS
 * ---------------
 * A graph is easier to trust when its inputs are contracted, its routing is
 * explicit, and its past runs can be replayed as tests. This demo turns a
 * ticket-triage flow into a saved trace, replays that trace against a fresh
 * flow, then gates the result with assert/score nodes and a case suite.
 *
 * Run: bun examples/v2/dataflow-eval-regression.js
 */
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsyncFlow, AsyncNode } from '../../src/qflow.js';
import { defineState } from '../../src/contracts.js';
import { BranchNode, MapNode, ReduceNode, describeGraph } from '../../src/graph.js';
import { AssertNode, ScoreNode, createEvalSuite, ReplayNode } from '../../src/eval.js';
import { recordFlow } from '../../src/testing.js';
import { normalizeTrace, writeTraceFile } from '../../src/trace.js';

const TicketState = defineState({
  name: 'TicketState',
  fields: { tickets: { type: 'array', required: true } },
});

const RiskState = defineState({
  name: 'RiskState',
  fields: { riskScore: { type: 'number', required: true, validate: value => value >= 0 || 'negative risk' } },
});

class DecisionNode extends AsyncNode {
  constructor(decision) {
    super();
    this.decision = decision;
  }

  async execAsync() {
    return this.decision;
  }

  async postAsync(shared, _prepRes, execRes) {
    shared.decision = execRes;
    return execRes;
  }
}

function makeFlow() {
  const scoreTickets = new MapNode({
    mapper: ticket => ({ id: ticket.id, weight: /urgent|down|outage/i.test(ticket.text) ? 3 : 1 }),
    inputKey: 'tickets',
    outputKey: 'scoredTickets',
    inputContract: TicketState,
  });
  const totalRisk = new ReduceNode({
    reducer: (sum, item) => sum + item.weight,
    initialValue: 0,
    inputKey: 'scoredTickets',
    outputKey: 'riskScore',
    outputContract: RiskState,
  });
  const route = new BranchNode({
    cases: {
      escalate: shared => shared.riskScore >= 5,
      routine: shared => shared.riskScore < 5,
    },
  });
  const escalate = new DecisionNode('escalate');
  const routine = new DecisionNode('routine');

  scoreTickets.next(totalRisk).next(route);
  route.next(escalate, 'escalate');
  route.next(routine, 'routine');

  const flow = new AsyncFlow(scoreTickets);
  flow.graph = describeGraph(scoreTickets);
  return flow;
}

try {
  TicketState.assert({ tickets: 'not-an-array' });
} catch (error) {
  console.log('1) Contract rejection:', error.errors[0]);
}

const outage = [
  { id: 1, text: 'checkout is down' },
  { id: 2, text: 'api urgent outage' },
];
const sourceFlow = makeFlow();
console.log('2) Graph:', sourceFlow.graph.nodes.map(node => node.label).join(' -> '));

const recorder = recordFlow(sourceFlow);
const shared = { tickets: outage };
const decision = await sourceFlow.runAsync(shared);
console.log(`   Live run: ${decision}, riskScore=${shared.riskScore}, decision=${shared.decision}`);

const tracePath = join(tmpdir(), `qflow-trace-${crypto.randomUUID()}.json`);
try {
  const trace = normalizeTrace({
    events: recorder.events,
    checkpoints: [{ shared: { tickets: outage } }],
  });
  await writeTraceFile(trace, tracePath);

  const replay = new ReplayNode({ tracePath, flowFactory: () => makeFlow() });
  const replayed = await new AsyncFlow(replay).runAsync({});
  console.log(`3) Trace replay: ${replayed.comparison.equal ? 'equal' : 'DIFFERENT'} ` +
    `(${replayed.comparison.differences.length} diffs) from ${trace.events.length} events`);

  const assertNode = new AssertNode({ operator: 'eq', expected: 'escalate', actualKey: 'decision' });
  const scoreNode = new ScoreNode({
    scorer: (_actual, _expected, state) => Math.min(1, state.riskScore / 6),
    threshold: 0.8,
  });
  assertNode.next(scoreNode, 'pass');

  const evalFlow = new AsyncFlow(assertNode);
  const evalShared = { tickets: outage, decision: 'escalate', riskScore: 6 };
  const evalResult = await evalFlow.runAsync(evalShared);
  console.log(`4) Quality gate: assert=${evalShared.assertions[0].passed}, score=${evalResult.score.toFixed(2)}`);

  const suite = createEvalSuite(makeFlow(), [
    { name: 'outage', shared: { tickets: outage } },
    { name: 'minor', shared: { tickets: [{ id: 3, text: 'docs typo' }] } },
  ]);
  const results = await suite.run();
  console.log('5) Suite:', results.map(result => `${result.name}=${result.result}`).join(', '));
} finally {
  try {
    unlinkSync(tracePath);
  } catch {
    // already gone
  }
}
