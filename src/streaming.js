export const LLM_DELTA_EVENT = 'llm:delta';
export const LLM_REASONING_EVENT = 'llm:reasoning';
export const LLM_DONE_EVENT = 'llm:done';

function parseErrorPayload(payload) {
  if (typeof payload === 'string') return payload;
  if (payload?.error?.message) return payload.error.message;
  return JSON.stringify(payload);
}

function extractText(chunk) {
  const choice = chunk?.choices?.[0];
  if (typeof choice?.delta?.content === 'string') return choice.delta.content;
  if (typeof choice?.text === 'string') return choice.text;
  if (typeof choice?.message?.content === 'string') return choice.message.content;
  return '';
}

function extractReasoning(chunk) {
  const delta = chunk?.choices?.[0]?.delta ?? {};
  if (typeof delta.reasoning_content === 'string') return delta.reasoning_content;
  if (typeof delta.reasoning === 'string') return delta.reasoning;
  return '';
}

/**
 * Stream an OpenAI-compatible chat completion and report each text delta.
 *
 * Works with OpenAI, DeepSeek, OpenRouter and the Hugging Face router because
 * they all speak the same `/chat/completions` SSE dialect. Returns the same
 * final string a non-streaming node would return.
 */
export async function streamChatCompletions({
  url,
  apiKey,
  model,
  messages,
  headers = {},
  body = {},
  signal,
  onDelta,
  onReasoning,
}) {
  if (!url) throw new Error('streamChatCompletions requires a URL.');
  if (!model) throw new Error('streamChatCompletions requires a model.');
  if (!Array.isArray(messages)) throw new Error('streamChatCompletions requires a messages array.');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...headers,
    },
    body: JSON.stringify({ model, messages, stream: true, ...body }),
    signal,
  });

  if (!response.ok) {
    let detail;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new Error(`Streaming LLM request failed (${response.status}): ${parseErrorPayload(detail)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.body || !contentType.includes('text/event-stream')) {
    const data = await response.json();
    const text = extractText({ choices: [{ message: data?.choices?.[0]?.message }] });
    onDelta?.({ delta: text, text, index: 0, raw: data });
    return {
      text,
      reasoning: '',
      finishReason: data?.choices?.[0]?.finish_reason ?? null,
      usage: data?.usage ?? null,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const result = {
    text: '',
    reasoning: '',
    finishReason: null,
    usage: null,
  };
  let buffer = '';
  let deltaIndex = 0;
  let doneReceived = false;

  const handleLine = line => {
    if (!line.startsWith('data:')) return;

    const data = line.slice(5).trim();
    if (!data) return;
    if (data === '[DONE]') {
      doneReceived = true;
      return;
    }

    let chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }

    if (chunk.error) {
      throw new Error(`Streaming LLM error: ${parseErrorPayload(chunk)}`);
    }

    result.finishReason = chunk.choices?.[0]?.finish_reason ?? result.finishReason;
    result.usage = chunk.usage ?? result.usage;

    const delta = extractText(chunk);
    if (delta) {
      const entry = {
        delta,
        text: result.text + delta,
        index: deltaIndex++,
        raw: chunk,
      };
      result.text += delta;
      onDelta?.(entry);
    }

    const reasoningDelta = extractReasoning(chunk);
    if (reasoningDelta) {
      result.reasoning += reasoningDelta;
      onReasoning?.({
        delta: reasoningDelta,
        text: result.reasoning,
        raw: chunk,
      });
    }
  };

  const consume = (value, { final = false } = {}) => {
    buffer += decoder.decode(value, { stream: !final }).replace(/\r\n/g, '\n');

    let newlineIndex;
    while (!doneReceived && (newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }

    if (final && !doneReceived && buffer.trim()) {
      handleLine(buffer.trim());
      buffer = '';
    }
  };

  try {
    while (!doneReceived) {
      const { done, value } = await reader.read();
      if (done) break;
      consume(value);
    }
    if (!doneReceived) consume(undefined, { final: true });
  } finally {
    if (doneReceived) await reader.cancel().catch(() => {});
    reader.releaseLock?.();
  }

  return result;
}
