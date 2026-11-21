import { describe, expect, test } from 'bun:test';
import { AsyncFlow, AsyncNode } from '../src/qflow.js';
import { AgentNode } from '../src/agent/agent.js';
import { AgentStreamingLLMNode, StreamingLLMNode } from '../src/nodes/streaming_llm.js';

class EmittingNode extends AsyncNode {
  async execAsync(prepRes, shared, observer) {
    observer.emit?.('custom:event', { value: 42, flowId: observer.flowId });
    return 'ok';
  }

  async postAsync() {
    return 'default';
  }
}

class NestedNode extends AsyncNode {
  async execAsync(prepRes, shared, observer) {
    const inner = new AsyncFlow(new EmittingNode());
    await inner.runAsync({}, observer);
    return 'nested';
  }

  async postAsync() {
    return 'default';
  }
}

class EchoTool extends AsyncNode {
  async execAsync() {
    return { echoed: this.params.value };
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

function sseServer(responder) {
  let requests = 0;

  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const body = await request.json();
      const { chunks, finishReason = 'stop' } = responder(body, requests++);
      const events = chunks.map((delta, index) => `data: ${JSON.stringify({
        choices: [{
          delta: { content: delta },
          finish_reason: index === chunks.length - 1 ? finishReason : null,
        }],
      })}\n\n`).join('');
      return new Response(`${events}data: [DONE]\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    },
  });

  return { server, baseUrl: `http://localhost:${server.port}/v1` };
}

describe('flow events', () => {
  test('nodes can emit custom events through the observer', async () => {
    const flow = new AsyncFlow(new EmittingNode());
    const events = [];
    const anyEvents = [];
    flow.on('custom:event', payload => events.push(payload));
    flow.onAny(entry => anyEvents.push(entry.event));

    const result = await flow.runAsync({});

    expect(result).toBe('ok');
    expect(events[0].value).toBe(42);
    expect(events[0].flowId).toBeDefined();
    expect(anyEvents).toContain('custom:event');
    expect(anyEvents).toContain('node:start');
  });

  test('nested flow events reach the parent flow', async () => {
    const flow = new AsyncFlow(new NestedNode());
    const events = [];
    flow.on('custom:event', payload => events.push(payload));

    await flow.runAsync({});

    expect(events).toHaveLength(1);
    expect(events[0].nested).toBe(true);
    expect(events[0].parentFlowId).toBeDefined();
  });
});

describe('StreamingLLMNode', () => {
  test('streams deltas as flow events and returns the full text', async () => {
    const { server, baseUrl } = sseServer(() => ({ chunks: ['Hello ', 'stream'] }));
    try {
      const node = new StreamingLLMNode();
      node.setParams({
        prompt: 'say hello',
        apiKey: 'test-key',
        model: 'test-model',
        baseUrl,
        max_tokens: 32,
      });

      const flow = new AsyncFlow(node);
      const deltas = [];
      const done = [];
      flow.on('llm:delta', payload => deltas.push(payload.delta));
      flow.on('llm:done', payload => done.push(payload));

      const result = await flow.runAsync({});

      expect(result).toBe('Hello stream');
      expect(deltas).toEqual(['Hello ', 'stream']);
      expect(done[0].text).toBe('Hello stream');
      expect(done[0].finishReason).toBe('stop');
    } finally {
      server.stop(true);
    }
  });

  test('agent LLM streaming reaches the outer flow', async () => {
    const responses = [
      JSON.stringify({ thought: 'calling echo', tool_calls: [{ tool: 'echo', parameters: { value: 'x' } }] }),
      JSON.stringify({ thought: 'done', tool_calls: [{ tool: 'finish', parameters: { output: 'streamed agent done' } }] }),
    ];
    const { server, baseUrl } = sseServer((body, requestIndex) => ({
      chunks: (() => {
        const full = responses[Math.min(requestIndex, responses.length - 1)];
        return [full.slice(0, 24), full.slice(24)];
      })(),
    }));
    try {
      const llm = new AgentStreamingLLMNode();
      llm.setParams({ apiKey: 'test-key', model: 'test-model', baseUrl });

      const agent = new AgentNode({
        llmNode: llm,
        availableTools: { echo: new EchoTool() },
        requireFinishConfirmation: false,
      });
      const flow = new AsyncFlow(agent);
      flow.setParams({ goal: 'stream a task' });

      const deltas = [];
      const done = [];
      flow.on('llm:delta', payload => deltas.push(payload.delta));
      flow.on('llm:done', payload => done.push(payload));

      const result = await flow.runAsync({});

      expect(result).toBe('streamed agent done');
      expect(deltas.join('')).toContain('calling echo');
      expect(deltas.join('')).toContain('streamed agent done');
      expect(done).toHaveLength(2);
    } finally {
      server.stop(true);
    }
  });
});
