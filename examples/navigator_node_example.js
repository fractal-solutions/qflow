import { NavigatorNode } from '../src/nodes/navigator.js';

async function runNavigator(action, params, shared) {
  const node = new NavigatorNode();
  node.setParams({ action, ...params });
  const result = await node.runAsync(shared);
  return result;
}

function getFirstRefByRole(snapshot, roles) {
  const nodes = snapshot?.nodes || snapshot?.elements || [];
  const match = nodes.find((item) => roles.includes(item.role));
  return match?.ref;
}

(async () => {
  const shared = {};
  const baseUrl = 'http://localhost:9867';
  const profileName = `qflow-navigator-${Date.now()}`;
  let profileId;
  let instanceId;
  let tabId;

  try {
    console.log('Navigator tool definition:', NavigatorNode.getToolDefinition().name);

    const orchestrator = await runNavigator('ensure_orchestrator', {
      baseUrl,
      autoStartOrchestrator: true,
      orchestratorWaitMs: 15000
    }, shared);
    console.log('orchestrator:', orchestrator.status);

    const profile = await runNavigator('create_profile', {
      baseUrl,
      profileName
    }, shared);
    profileId = profile.id;
    console.log('profile:', profileId, profileName);

    const profiles = await runNavigator('list_profiles', { baseUrl }, shared);
    console.log('profiles total:', Array.isArray(profiles) ? profiles.length : 0);

    const instance = await runNavigator('start_instance', {
      baseUrl,
      mode: 'headless',
      profileId
    }, shared);
    instanceId = instance.id;
    console.log('instance:', instanceId, instance.status);

    const ready = await runNavigator('wait_instance_ready', {
      baseUrl,
      instanceId,
      waitTimeoutMs: 20000,
      pollIntervalMs: 500
    }, shared);
    console.log('instance ready:', ready.ready, `(${ready.waitedMs}ms)`);

    const html = `
      <html>
        <head><title>Qflow Navigator Demo</title></head>
        <body>
          <h1>Qflow Navigator</h1>
          <a href="https://example.com" aria-label="Example Link">Open Example</a>
          <form>
            <label>Email <input aria-label="Email Input" value=""></label>
            <label>Plan
              <select aria-label="Plan Select">
                <option>Basic</option>
                <option>Pro</option>
              </select>
            </label>
            <button type="button" aria-label="Submit Button" onclick="document.querySelector('#status').textContent='submitted'">Submit</button>
          </form>
          <p id="status">idle</p>
        </body>
      </html>
    `;

    const tab = await runNavigator('open_tab', {
      baseUrl,
      instanceId,
      url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    }, shared);
    tabId = tab.id;
    console.log('tab:', tabId);

    const snapshot = await runNavigator('snapshot', {
      baseUrl,
      tabId,
      snapshotOptions: {
        interactive: true,
        compact: true,
        depth: 3,
        maxTokens: 1800
      }
    }, shared);
    const nodes = snapshot?.nodes || snapshot?.elements || [];
    console.log('snapshot nodes:', nodes.length);

    const emailRef = getFirstRefByRole(snapshot, ['textbox']);
    const selectRef = getFirstRefByRole(snapshot, ['combobox', 'listbox']);
    const submitRef = getFirstRefByRole(snapshot, ['button']);
    const linkRef = getFirstRefByRole(snapshot, ['link']);

    if (emailRef && selectRef && submitRef) {
      const batchAction = await runNavigator('actions', {
        baseUrl,
        tabId,
        interactions: [
          { kind: 'fill', ref: emailRef, text: 'agent@qflow.dev' },
          { kind: 'select', ref: selectRef, text: 'Pro' },
          { kind: 'click', ref: submitRef }
        ]
      }, shared);
      console.log('actions count:', batchAction?.results?.length ?? 0);
    }

    if (linkRef) {
      await runNavigator('action', {
        baseUrl,
        tabId,
        interaction: { kind: 'hover', ref: linkRef }
      }, shared);
      console.log('single action: hover on link');
    }

    const text = await runNavigator('text', {
      baseUrl,
      tabId
    }, shared);
    console.log('text preview:', (text.text || '').slice(0, 90).replace(/\s+/g, ' '));

    const evalResult = await runNavigator('evaluate', {
      baseUrl,
      tabId,
      expression: 'JSON.stringify({ title: document.title, status: document.querySelector("#status")?.textContent })'
    }, shared);
    console.log('evaluate result:', evalResult?.result || evalResult);

    await runNavigator('lock_tab', {
      baseUrl,
      tabId,
      owner: 'qflow-example-agent',
      ttl: 30
    }, shared);
    const lockStatus = await runNavigator('tab_lock_status', {
      baseUrl,
      tabId
    }, shared);
    console.log('lock status:', lockStatus);

    await runNavigator('unlock_tab', {
      baseUrl,
      tabId,
      owner: 'qflow-example-agent'
    }, shared);

    const fingerprint = await runNavigator('rotate_fingerprint', {
      baseUrl,
      tabId
    }, shared);
    console.log('fingerprint rotated:', fingerprint?.rotated ?? true);

    const fpStatus = await runNavigator('fingerprint_status', {
      baseUrl,
      tabId
    }, shared);
    console.log('fingerprint status:', fpStatus);

    const cookies = await runNavigator('get_cookies', {
      baseUrl,
      tabId
    }, shared);
    console.log('cookies:', Array.isArray(cookies) ? cookies.length : 0);

    const screenshot = await runNavigator('screenshot', {
      baseUrl,
      tabId,
      outputPath: './examples/output/navigator-demo.jpg',
      screenshotOptions: { format: 'jpeg', quality: 82 }
    }, shared);
    console.log('screenshot:', screenshot.outputPath, screenshot.sizeBytes);

    const pdf = await runNavigator('pdf', {
      baseUrl,
      tabId,
      outputPath: './examples/output/navigator-demo.pdf',
      pdfOptions: { landscape: false, scale: 1.0 }
    }, shared);
    console.log('pdf:', pdf.outputPath, pdf.sizeBytes);

    console.log('\nNavigator example completed successfully.');
  } catch (error) {
    console.error('\nNavigator example failed:', error.message);
    throw error;
  } finally {
    if (tabId) {
      try {
        await runNavigator('close_tab', { baseUrl, tabId }, shared);
      } catch (error) {
        console.warn('close_tab cleanup skipped:', error.message);
      }
    }

    if (instanceId) {
      try {
        await runNavigator('stop_instance', { baseUrl, instanceId }, shared);
      } catch (error) {
        console.warn('stop_instance cleanup skipped:', error.message);
      }
    }

    if (profileId) {
      try {
        await runNavigator('delete_profile', { baseUrl, profileId }, shared);
      } catch (error) {
        console.warn('delete_profile cleanup skipped:', error.message);
      }
    }
  }
})();
