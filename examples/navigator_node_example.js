import { AsyncFlow, AsyncNode } from '@fractal-solutions/qflow';
import { NavigatorNode } from '@fractal-solutions/qflow/nodes';

const BASE_URL = 'http://localhost:9867';
const TARGET_URL = 'https://the-internet.herokuapp.com/login';

async function runNavigator(shared, action, params = {}) {
  const node = new NavigatorNode();
  node.setParams({ action, baseUrl: shared.baseUrl, ...params });
  return await node.runAsync(shared);
}

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.tabs)) return value.tabs;
  if (value && Array.isArray(value.instances)) return value.instances;
  if (value && Array.isArray(value.profiles)) return value.profiles;
  return [];
}

class InitNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    shared.baseUrl = BASE_URL;
    shared.mode = 'unknown';
    shared.profileId = null;
    shared.instanceId = null;
    shared.tabId = null;
    console.log('Navigator tool definition:', NavigatorNode.getToolDefinition().name);
    return 'default';
  }
}

class EnsureNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    const status = await runNavigator(shared, 'ensure_orchestrator', {
      autoStartOrchestrator: true,
      orchestratorWaitMs: 10000
    });
    console.log('orchestrator:', status?.status || 'running');
    return 'default';
  }
}

class DetectModeNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    try {
      const probe = await runNavigator(shared, 'create_profile', {
        profileName: `qflow-probe-${Date.now()}`
      });
      shared.mode = 'orchestrator';
      shared.profileId = probe?.id || null;
      return 'orchestrator';
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('HTTP 405') && message.includes('POST /profiles')) {
        shared.mode = 'single_session';
        return 'single_session';
      }
      throw error;
    }
  }

  async postAsync(shared, prepRes, execRes) {
    return execRes;
  }
}

class OrchestratorPathNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    console.log('mode: orchestrator');

    const instance = await runNavigator(shared, 'start_instance', {
      profileId: shared.profileId,
      mode: 'headless'
    });
    shared.instanceId = instance.id;

    await runNavigator(shared, 'wait_instance_ready', {
      instanceId: shared.instanceId,
      waitTimeoutMs: 20000,
      pollIntervalMs: 500
    });

    const tab = await runNavigator(shared, 'open_tab', {
      instanceId: shared.instanceId,
      url: TARGET_URL
    });
    shared.tabId = tab.id;

    console.log('tab:', shared.tabId);
    return 'default';
  }
}

class SingleSessionPathNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    console.log('mode: single-session');
    const tabs = arr(await runNavigator(shared, 'list_tabs'));
    if (!tabs.length) {
      throw new Error('No tabs found in single-session mode.');
    }

    shared.tabId = tabs[0].id;
    await runNavigator(shared, 'navigate', {
      tabId: shared.tabId,
      url: TARGET_URL,
      timeout: 15000
    });

    console.log('tab:', shared.tabId);
    return 'default';
  }
}

class DemoActionsNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    const snapshot = await runNavigator(shared, 'snapshot', {
      tabId: shared.tabId,
      snapshotOptions: {
        interactive: true,
        compact: true,
        depth: 4,
        maxTokens: 1800
      }
    });
    const nodes = snapshot?.nodes || snapshot?.elements || [];
    console.log('snapshot nodes:', nodes.length);

    const evalRes = await runNavigator(shared, 'evaluate', {
      tabId: shared.tabId,
      expression: 'JSON.stringify({ title: document.title, url: location.href })',
      awaitExpression: true
    });
    console.log('evaluate:', evalRes?.result || evalRes);

    const text = await runNavigator(shared, 'text', { tabId: shared.tabId });
    console.log('text preview:', String(text?.text || '').slice(0, 120).replace(/\s+/g, ' '));

    const screenshot = await runNavigator(shared, 'screenshot', {
      tabId: shared.tabId,
      outputPath: './examples/output/navigator-demo.jpg',
      screenshotOptions: { format: 'jpeg', quality: 85 }
    });
    console.log('screenshot:', screenshot?.outputPath, screenshot?.sizeBytes);

    const pdf = await runNavigator(shared, 'pdf', {
      tabId: shared.tabId,
      outputPath: './examples/output/navigator-demo.pdf',
      pdfOptions: { landscape: false, scale: 1.0 }
    });
    console.log('pdf:', pdf?.outputPath, pdf?.sizeBytes);

    return 'default';
  }
}

class CleanupNode extends AsyncNode {
  async execAsync(prepRes, shared) {
    if (shared.mode === 'orchestrator' && shared.tabId) {
      try { await runNavigator(shared, 'close_tab', { tabId: shared.tabId }); } catch {}
    }
    if (shared.mode === 'orchestrator' && shared.instanceId) {
      try { await runNavigator(shared, 'stop_instance', { instanceId: shared.instanceId }); } catch {}
    }
    if (shared.mode === 'orchestrator' && shared.profileId) {
      try { await runNavigator(shared, 'delete_profile', { profileId: shared.profileId }); } catch {}
    }
    console.log('\nNavigator demo completed.');
    return 'default';
  }
}

const initNode = new InitNode();
const ensureNode = new EnsureNode();
const detectNode = new DetectModeNode();
const orchestratorNode = new OrchestratorPathNode();
const singleSessionNode = new SingleSessionPathNode();
const demoNode = new DemoActionsNode();
const cleanupNode = new CleanupNode();

initNode.next(ensureNode);
ensureNode.next(detectNode);
detectNode.next(orchestratorNode, 'orchestrator');
detectNode.next(singleSessionNode, 'single_session');
orchestratorNode.next(demoNode);
singleSessionNode.next(demoNode);
demoNode.next(cleanupNode);

const flow = new AsyncFlow(initNode);

try {
  await flow.runAsync({});
} catch (error) {
  console.error('\nNavigator example failed:', error.message);
  throw error;
}
