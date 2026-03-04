## NavigatorNode

`NavigatorNode` integrates qflow with PinchTab for tab-centric browser automation. It supports profile/instance/tab lifecycle operations, page interaction, extraction, media export, locking, and fingerprint operations.

### Requirements

* PinchTab must be installed and accessible.
* Default orchestrator URL is `http://localhost:9867`.
* You can set `autoStartOrchestrator: true` to let the node start PinchTab if it is not already running.

### Parameters

* `action` (required): Operation to run.
* `baseUrl`: PinchTab orchestrator URL. Default: `http://localhost:9867`.
* `autoStartOrchestrator`: Start PinchTab automatically if unreachable.
* `orchestratorWaitMs`: Startup wait window in milliseconds.
* `pinchtabBinaryPath`: Optional full path to the PinchTab binary.

Common scoped identifiers:
* `profileId`, `profileName`
* `instanceId`
* `tabId`

Common action payload fields:
* `url`, `timeout`, `blockImages`, `blockAds`
* `snapshotOptions` (`interactive`, `compact`, `depth`, `maxTokens`, `filter`)
* `interaction` (single action payload)
* `interactions` (array for batch actions)
* `expression`, `awaitExpression`
* `screenshotOptions`, `pdfOptions`
* `outputPath`, `includeBase64`
* `owner`, `ttl` (locking)
* `cookies`
* `waitTimeoutMs`, `pollIntervalMs`

### Supported Actions

Orchestrator:
* `ensure_orchestrator`

Profiles:
* `create_profile`
* `list_profiles`
* `get_profile`
* `delete_profile`

Instances:
* `start_instance`
* `list_instances`
* `get_instance`
* `wait_instance_ready`
* `stop_instance`
* `get_instance_logs`

Tabs and page operations:
* `open_tab`
* `list_tabs`
* `get_tab`
* `close_tab`
* `navigate`
* `snapshot`
* `text`
* `evaluate`
* `action`
* `actions`
* `screenshot`
* `pdf`

Advanced tab controls:
* `get_cookies`
* `set_cookies`
* `delete_cookies`
* `lock_tab`
* `unlock_tab`
* `tab_lock_status`
* `rotate_fingerprint`
* `fingerprint_status`

### Shared State Outputs

After execution, the node writes:
* `shared.navigatorLastResult`

For creation actions:
* `shared.navigatorProfileId` (after `create_profile`)
* `shared.navigatorInstanceId` (after `start_instance`)
* `shared.navigatorTabId` (after `open_tab`)

### Example Usage

See full example: [examples/navigator_node_example.js](../../examples/navigator_node_example.js)

```javascript
import { NavigatorNode } from '@fractal-solutions/qflow/nodes';

const shared = {};

const ensure = new NavigatorNode();
ensure.setParams({
  action: 'ensure_orchestrator',
  baseUrl: 'http://localhost:9867',
  autoStartOrchestrator: true
});
await ensure.runAsync(shared);

const start = new NavigatorNode();
start.setParams({ action: 'start_instance', mode: 'headless' });
await start.runAsync(shared);

const open = new NavigatorNode();
open.setParams({
  action: 'open_tab',
  instanceId: shared.navigatorInstanceId,
  url: 'https://example.com'
});
await open.runAsync(shared);

// Continue with snapshot/action/text/screenshot operations using shared.navigatorTabId.
```
