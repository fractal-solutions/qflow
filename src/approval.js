import { AsyncNode } from './qflow.js';
import { ApprovalPendingError, resolveTemplate, stableHash } from './util.js';

export { ApprovalPendingError };

/**
 * Resolve a stable approval ID. Templates use `{{sharedKey}}`, so
 * `{{orderId}}` becomes `approval:ord-42`. Without a template the ID is a hash
 * of the prompt and shared state.
 */
export function resolveApprovalId(template, { params = {}, shared = {}, prompt = '' } = {}) {
  if (typeof template === 'function') return String(template({ params, shared, prompt }));
  if (template == null || template === true) {
    return `approval:${stableHash({ prompt, shared })}`;
  }
  const rendered = resolveTemplate(String(template), { ...shared, ...params, params, shared, prompt }).trim();
  if (!rendered) return `approval:${stableHash({ prompt, shared })}`;
  return rendered.startsWith('approval:') ? rendered : `approval:${rendered}`;
}

/**
 * Suspend a durable run until a decision is recorded with
 * `checkpointer.approve(runId, decision, approvalId)` or `reject(...)`.
 *
 * The node is re-entered on resume and reads the recorded decision, so no
 * special hydration of `shared` is needed.
 */
export class WaitForApprovalNode extends AsyncNode {
  constructor({
    approvalId = null,
    prompt = null,
    promptKey = 'approvalPrompt',
    resultKey = 'approval',
    approvalsKey = 'approvals',
    metadata = null,
  } = {}) {
    super();
    this.approvalId = approvalId;
    this.prompt = prompt;
    this.promptKey = promptKey;
    this.resultKey = resultKey;
    this.approvalsKey = approvalsKey;
    this.metadata = metadata;
  }

  async prepAsync(shared = {}) {
    const promptText = this.params.prompt ?? this.prompt
      ?? shared[this.params.promptKey ?? this.promptKey] ?? '';
    return { prompt: String(promptText), shared };
  }

  async execAsync(prepRes, shared = {}, observer = {}) {
    const checkpointer = this.params.checkpointer ?? observer.checkpointer ?? shared.checkpointer;
    const runId = this.params.runId ?? observer.runId ?? shared.runId;
    if (!checkpointer || typeof checkpointer.requestApproval !== 'function') {
      throw new Error('WaitForApprovalNode requires a checkpointer with requestApproval().');
    }
    if (!runId) throw new Error('WaitForApprovalNode requires a durable runId.');

    const id = resolveApprovalId(this.params.approvalId ?? this.approvalId, {
      params: this.params,
      shared,
      prompt: prepRes.prompt,
    });
    const record = checkpointer.requestApproval({
      runId,
      approvalId: id,
      prompt: prepRes.prompt,
      metadata: this.params.metadata ?? this.metadata,
    });
    if (record.status === 'pending') {
      observer.emit?.('approval:requested', { runId, approvalId: id, prompt: prepRes.prompt });
      throw new ApprovalPendingError(id, {
        runId,
        prompt: prepRes.prompt,
        step: observer.step ?? null,
      });
    }

    observer.emit?.('approval:resolved', {
      runId,
      approvalId: id,
      status: record.status,
    });
    return { ...(record.decision ?? {}), approvalId: id, status: record.status };
  }

  async postAsync(shared, prepRes, execRes) {
    shared[this.resultKey] = execRes;
    shared[this.approvalsKey] = {
      ...(shared[this.approvalsKey] ?? {}),
      [execRes.approvalId]: execRes,
    };
    if (!Object.keys(this.successors).length) return execRes;
    return execRes.approved === false || execRes.status === 'rejected' ? 'reject' : 'approve';
  }
}
