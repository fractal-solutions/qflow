PinchTab
Welcome to PinchTab — browser control for AI agents, scripts, and automation workflows.

What is PinchTab?
PinchTab is a standalone HTTP server that gives you direct control over a Chrome browser. Any AI agent can use the CLI or HTTP API.

CLI example:

```bash
terminal
# Navigate
pinchtab nav https://example.com
# Get interactive elements
pinchtab snap -i -c
# Click element by ref
pinchtab click e5
HTTP example (realistic flow):
```

```bash
terminal
# 1. Navigate to URL (returns tabId)
TAB=$(curl -s -X POST http://localhost:9867/tab \
  -d '{"action":"new","url":"https://example.com"}' | jq -r '.tabId')
# 2. Get page structure
curl -s "http://localhost:9867/snapshot?tabId=$TAB&filter=interactive" | jq
# 3. Click element using the tabId
curl -s -X POST http://localhost:9867/action \
  -d "{\"kind\":\"click\",\"ref\":\"e5\",\"tabId\":\"$TAB\"}"
```

Characteristics
Tab-Centric — Everything revolves around tabs, not URLs
Stateful — Sessions persist between requests. Log in once, stay logged in across restarts
Token Inexpensive — Text extraction at 800 tokens/page (5-13x cheaper than full snapshots)
Flexible Modes — Run headless, headed, with browser profiles, or connect to external Chrome via CDP
Monitoring & Control — Tab locking for multi-agent safety, stealth mode for bot detection bypass
Features
🌲 Accessibility Tree — Structured DOM with stable refs (e0, e1…) for click, type, read. No coordinate guessing.
🎯 Smart Filters — ?filter=interactive returns only buttons, links, inputs. Fewer tokens per snapshot.
🕵️ Stealth Mode — Patches navigator.webdriver, spoofs UA, hides automation flags for bot detection bypass.
📝 Text Extraction — Readability mode (clean) or raw (full HTML). Choose based on workflow.
🖱️ Direct Actions — Click, type, fill, press, focus, hover, select, scroll by ref or selector.
⚡ JavaScript Execution — Run arbitrary JS in any tab. Escape hatch for workflow gaps.
📸 Screenshots — JPEG output with quality control.
📄 PDF Export — Full pages to PDF with headers, footers, landscape mode.
🎭 Multi-Tab — Create, switch, close tabs. Work with multiple pages concurrently.


Core Concepts
PinchTab is an HTTP server that controls four key entities: PinchTab itself, Instances, Profiles, and Tabs.

See also:

Instance API Reference — Complete instance endpoints
Tabs API Reference — Tab management endpoints
Profile API Reference — Profile management endpoints
PinchTab
The HTTP server controller (orchestrator) that manages all instances, profiles, and tabs.

Listens on port 9867 (configurable, dashboard + API)
Routes requests to the appropriate instance
Manages instance lifecycle (launch, monitor, stop)
Provides unified HTTP API for all operations
No Chrome process itself — purely orchestrator
```bash
terminal
# Start PinchTab orchestrator (default: port 9867)
pinchtab
# Listening on http://localhost:9867
# Or specify port
BRIDGE_PORT=9870 pinchtab
# Listening on http://localhost:9870
```

Instance
A running Chrome process with an optional profile, auto-allocated to a unique port (9868-9968 by default).

One Chrome browser per instance
Optional profile (see Profile below)
Can host multiple tabs
Completely isolated from other instances
Identified by instance ID: inst_XXXXXXXX (hash-based, stable)
Auto-allocated to unique port in 9868-9968 range
Lazy Chrome initialization (starts on first request, not at creation)
Key constraint: One instance = one Chrome process = zero or one profile.

Creating Instances
Instances are managed by the orchestrator via the API (not by running separate processes).

```bash
terminal
# CLI: Create instance (headless by default)
pinchtab instance launch
# CLI: Create headed (visible) instance
pinchtab instance launch --mode headed
# CLI: Create with specific port
pinchtab instance launch --mode headed --port 9999
# Curl: Create instance via API
curl -X POST http://localhost:9867/instances/launch \
  -H "Content-Type: application/json" \
  -d '{"mode": "headed", "port": "9999"}'
# Response
{
  "id": "inst_0a89a5bb",
  "profileId": "prof_278be873",
  "profileName": "Instance-...",
  "port": "9868",
  "headless": false,
  "status": "starting"
}
```

Multiple Instances
You can run multiple instances simultaneously for isolation and scalability. The orchestrator manages them automatically:

```bash
terminal
# Terminal 1: Start orchestrator
pinchtab
# Terminal 2: Create multiple instances
for i in 1 2 3; do
  pinchtab instance launch --mode headless
done
# List all instances
curl http://localhost:9867/instances | jq .
# Response: 3 independent instances on ports 9868, 9869, 9870
[
  {"id": "inst_0a89a5bb", "port": "9868", "status": "running"},
  {"id": "inst_1b9a5dcc", "port": "9869", "status": "running"},
  {"id": "inst_2c8a5eef", "port": "9870", "status": "running"}
]
```

Each instance is completely independent — no shared state, no cookie leakage, no resource contention.

Profile
A browser profile (Chrome user data directory) containing browser state. Optional per instance.

Holds browser state: cookies, local storage, cache, browsing history, extensions
Only one profile per instance
Multiple tabs can share the same profile (and its state)
Identified by profile ID: prof_XXXXXXXX (hash-based, stable)
Useful for: user accounts, login sessions, multi-tenant workflows
Persistent across instance restarts
Key constraint: Instance without a profile = ephemeral, no persistent state across restarts.

Managing Profiles
```bash
terminal
# CLI: List all profiles
pinchtab profiles
# CLI: Create profile
pinchtab profile create my-profile
# Curl: List profiles (excludes temporary auto-generated profiles)
curl http://localhost:9867/profiles | jq .
# Response
[
  {
    "id": "278be873",
    "name": "my-profile",
    "created": "2026-03-01T05:21:38.274Z",
    "diskUsage": 5242880,
    "source": "created"
  }
]
```

Using Profiles with Instances
```bash
terminal
# Create instance with specific profile
curl -X POST http://localhost:9867/instances/start \
  -H "Content-Type: application/json" \
  -d '{"profileId": "278be873"}'
# Or via CLI
pinchtab instance launch  # Uses temp auto-generated profile
```

Profile Use Cases
Separate User Accounts:

Architecture Diagram
ASCII
Instance 1 (profile: alice)
  ├── Tab 1: alice@example.com logged in
  └── Tab 2: alice@example.com dashboard
Instance 2 (profile: bob)
  ├── Tab 1: bob@example.com logged in
  └── Tab 2: bob@example.com dashboard
```bash
terminal
# Create profiles for each user
pinchtab profile create alice
pinchtab profile create bob
# Start instances with profiles
curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId": "alice-profile-id"}'
curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId": "bob-profile-id"}'
# Each instance has isolated cookies/auth
```

Login Once, Use Anywhere:

```bash
terminal
# Start instance with persistent profile
curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId": "work"}'
# Navigate and log in
curl -X POST http://localhost:9867/instances/inst_xyz/navigate \
  -d '{"url": "https://example.com/login"}'
# ... fill login form, click submit ...
# Later (even after instance restart): Profile is persistent
pinchtab instance launch  # Or restart orchestrator
# Cookies intact, still logged in via profile's saved state
```
Tab
A browser tab (webpage) within an instance and its profile.

Single webpage with its own DOM, URL, accessibility tree
Identified by tab ID: tab_XXXXXXXX (hash-based, stable)
Tabs are ephemeral (don’t survive instance restart unless using a profile)
Multiple tabs can be open simultaneously in one instance
Each tab has stable element references (e0, e1…) for DOM interaction
Can navigate, take snapshots, execute actions, evaluate JavaScript
```bash
terminal
# Create tab in instance (returns tabId)
curl -X POST http://localhost:9867/instances/inst_0a89a5bb/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' | jq '.tabId'
# Returns: "tab_abc123"
# Or via CLI
pinchtab tab open inst_0a89a5bb https://example.com
# Get tab info
curl http://localhost:9867/tabs/tab_abc123 | jq .
# Navigate tab
curl -X POST http://localhost:9867/instances/inst_0a89a5bb/navigate \
  -d '{"url": "https://google.com"}'
# Take snapshot (DOM structure)
curl http://localhost:9867/instances/inst_0a89a5bb/snapshot | jq .
# Interact with tab (click, type, etc.)
curl -X POST http://localhost:9867/instances/inst_0a89a5bb/action \
  -d '{"kind": "click", "ref": "e5"}'
# Close tab
curl -X POST http://localhost:9867/tabs/tab_abc123/close
# Or via CLI
pinchtab tab close tab_abc123
```

See: Tabs API Reference for complete operations.

Hierarchy
Architecture Diagram
ASCII
PinchTab Orchestrator (HTTP server on port 9867)
  │
  ├── Instance 1 (inst_0a89a5bb, port 9868, temp profile)
  │     ├── Tab 1 (tab_xyz123, https://example.com)
  │     ├── Tab 2 (tab_xyz124, https://google.com)
  │     └── Tab 3 (tab_xyz125, https://github.com)
  │
  ├── Instance 2 (inst_1b9a5dcc, port 9869, profile: work)
  │     ├── Tab 1 (tab_abc001, internal dashboard, logged in as alice)
  │     └── Tab 2 (tab_abc002, internal docs)
  │
  └── Instance 3 (inst_2c8a5eef, port 9870, profile: personal)
        ├── Tab 1 (tab_def001, gmail, logged in as bob@example.com)
        └── Tab 2 (tab_def002, bank.com)
Relationships & Constraints
Relationship	Rule
Tabs → Instance	Every tab must exist in exactly one instance
Tabs → Profile	Every tab inherits the instance’s profile (zero or one)
Profile → Instance	Every profile belongs to exactly one instance
Instance → Profile	An instance has zero or one profile
Instance → Chrome	One instance = one Chrome process
Common Workflows
Workflow 1: Single Instance, Multiple Tabs
```bash
terminal
# Terminal 1: Start orchestrator
pinchtab
# Terminal 2: Create instance
INST=$(pinchtab instance launch --mode headless)
# Returns: inst_0a89a5bb
# Create multiple tabs in the same instance
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com"}'
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://google.com"}'
# List all tabs across all instances
curl http://localhost:9867/tabs | jq .
# Or tabs in specific instance
curl http://localhost:9867/instances/$INST/tabs | jq .
```

Workflow 2: Multiple Instances, Separate Profiles
```bash
terminal
# Create persistent profiles for Alice and Bob
pinchtab profile create alice
pinchtab profile create bob
# Get profile IDs
ALICE_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="alice") | .id')
BOB_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="bob") | .id')
# Start instance for Alice
INST_ALICE=$(curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$ALICE_ID'"}' | jq -r '.id')
# Start instance for Bob
INST_BOB=$(curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$BOB_ID'"}' | jq -r '.id')
# Create tabs in both instances with isolated cookies
curl -X POST http://localhost:9867/instances/$INST_ALICE/tabs/open \
  -d '{"url":"https://app.example.com"}'
curl -X POST http://localhost:9867/instances/$INST_BOB/tabs/open \
  -d '{"url":"https://app.example.com"}'
# Login in each instance separately — profiles keep sessions isolated
```

Workflow 3: Ephemeral Instance (No Profile)
```bash
terminal
# Create instance without persistent profile (temporary auto-generated)
INST=$(pinchtab instance launch)
# Create tab, use it
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com"}'
# ... work ...
# Stop instance
pinchtab instance stop $INST
# Tab is gone, all cookies gone — clean slate next time
Workflow 4: Polling for Instance Ready Status
```bash
terminal
# Create instance (returns with status "starting")
INST=$(pinchtab instance launch | jq -r '.id')
# Poll until running (monitor's health check initializes Chrome)
while true; do
  STATUS=$(curl http://localhost:9867/instances/$INST | jq -r '.status')
  if [ "$STATUS" == "running" ]; then
    echo "Instance ready!"
    break
  fi
  echo "Instance status: $STATUS, waiting..."
  sleep 0.5
done
# Now safe to make requests to the instance
curl -X POST http://localhost:9867/instances/$INST/navigate \
  -d '{"url":"https://example.com"}'
```
Mental Model
Architecture Diagram
ASCII
What you control         │ What it is               │ Identified by
─────────────────────────┼──────────────────────────┼─────────────────────
PinchTab Orchestrator    │ HTTP server controller   │ port (9867 default)
Instance                 │ Chrome process           │ inst_XXXXXXXX (hash ID)
Profile (optional)       │ Browser state directory  │ prof_XXXXXXXX (hash ID)
Tab                      │ Single webpage           │ tab_XXXXXXXX (hash ID)
Summary
PinchTab Orchestrator is the HTTP server that manages everything
Instance is a running Chrome process with optional profile and multiple tabs
Profile is optional persistent browser state (cookies, auth, history)
Tab is the actual webpage you navigate and interact with
Key insights:

Instances are launched via API and auto-allocated unique ports (9868-9968)
Instances are lazy: Chrome initializes on first request, not at creation time
Profiles are optional but provide persistent state across instance restarts
Tabs are ephemeral unless using a persistent profile
Instance + Profile + Tabs = the complete mental model for using PinchTab effectively



Headless vs Headed
PinchTab instances can run Chrome in two modes: Headless (no visible UI) and Headed (visible window). Understanding the tradeoffs helps you choose the right mode for your workflow.

Note: You run a single orchestrator (pinchtab), then create instances with different modes via the API.

Headless Mode (Default)
Chrome runs without a visible window. All interactions happen via the API.

bash
terminal
# Start orchestrator (once)
pinchtab
# Terminal 2: Create headless instance (default)
pinchtab instance launch
# Or via curl
curl -X POST http://localhost:9867/instances/launch \
  -H "Content-Type: application/json" \
  -d '{"mode": "headless"}'
# Response
{
  "id": "inst_0a89a5bb",
  "port": "9868",
  "headless": true,
  "status": "starting"
}
Characteristics
✅ No UI overhead — No window rendering, faster operations
✅ Scriptable — Perfect for automation, CI/CD, unattended workflows
✅ Lightweight — Lower CPU/memory than headed mode
✅ Remote-friendly — Works over SSH, Docker, cloud servers
❌ Can’t see what’s happening — Debugging requires screenshots or logs
Use Cases
AI agents — Automated tasks, form filling, data extraction
CI/CD pipelines — Testing, scraping, report generation
Cloud servers — VPS, Lambda, container orchestration
Production workflows — Long-running tasks, batch processing
Headed Mode
Chrome runs with a visible window that you can see and interact with.

bash
terminal
# Start orchestrator (once)
pinchtab
# Terminal 2: Create headed instance
pinchtab instance launch --mode headed
# Or via curl
curl -X POST http://localhost:9867/instances/launch \
  -H "Content-Type: application/json" \
  -d '{"mode": "headed"}'
# Response
{
  "id": "inst_1b9a5dcc",
  "port": "9869",
  "headless": false,
  "status": "starting"
}
Characteristics
✅ Visual feedback — See exactly what’s happening in real-time
✅ Debuggable — Watch the browser, inspect elements, debug flows
✅ Interactive — You can click, type, scroll in the window manually
✅ Development-friendly — Great for testing, debugging, prototyping
❌ Slower — Window rendering adds latency
❌ Requires a display — Needs X11/Wayland on Linux, native desktop on macOS/Windows
❌ Resource-heavy — More CPU/memory for rendering
Use Cases
Development & debugging — Build and test automation scripts
Local testing — Verify workflows before production
Live demonstrations — Show what your automation is doing
Interactive debugging — Watch and modify behavior in real-time
Manual collaboration — A human watches and guides the automation
Viewing Headed Instances in the Dashboard
The Pinchtab dashboard lets you monitor both headless and headed instances:

Dashboard showing instances tab with a headed mode instance running

When you launch a headed instance:

Mode field shows “headed” (vs “headless”)
Port indicates which port the instance is listening on
Status shows “Running” with green badge
STOP button allows graceful shutdown
The dashboard automatically detects the mode and displays the appropriate controls. You can see the real Chrome window alongside the dashboard for visual verification.

Side-by-Side Comparison
Aspect	Headless	Headed
Visibility	❌ Invisible	✅ Visible window
Speed	✅ Fast	❌ Slower (2-3x)
Resource usage	✅ Light	❌ Heavy
Debugging	❌ Hard	✅ Easy
Display required	❌ No	✅ Yes (X11/Wayland/native)
Automation	✅ Perfect	⚠️ Can interact manually
CI/CD	✅ Ideal	❌ Not practical
Development	⚠️ Possible	✅ Recommended
When to Use Headless
Use headless for:

Production automation (scripts, agents, workflows)
CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
Unattended execution (servers, containers, cloud functions)
High-throughput tasks (scraping 1000s of pages)
Cost-sensitive environments (minimize CPU/memory)
Long-running processes (24/7 automation)
bash
terminal
# Production: Create headless instance
pinchtab instance launch
# Or multiple headless instances for scale
for i in 1 2 3; do
  pinchtab instance launch --mode headless
done
# List all instances
curl http://localhost:9867/instances | jq .
When to Use Headed
Use headed for:

Local development (debugging scripts)
Testing automation behavior
Demonstrating workflows to humans
Prototyping and experimentation
Interactive debugging (pause and inspect)
Manual verification before production
bash
terminal
# Development: Create headed instance with profile
pinchtab profile create dev
# Get profile ID
DEV_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="dev") | .id')
# Start headed instance with profile
curl -X POST http://localhost:9867/instances/start \
  -H "Content-Type: application/json" \
  -d '{"profileId":"'$DEV_ID'","mode":"headed"}'
# Or simpler: start without persistent profile
pinchtab instance launch --mode headed
Display Requirements
Display requirements apply to headed instances, not the orchestrator. The orchestrator can run anywhere and create instances in any mode.

On macOS
Native window system — headed instances work out of the box
bash
terminal
pinchtab  # Orchestrator
# Terminal 2:
pinchtab instance launch --mode headed
On Linux
Headless instances: Work anywhere (no display needed)
Headed instances: Require X11 or Wayland display server
In a Docker container: Forward DISPLAY environment variable
In a headless server: Use headless mode only
bash
terminal
# Orchestrator on remote server (SSH)
ssh user@server 'pinchtab &'
# Create headed instance via X11 forwarding
ssh -X user@server 'pinchtab instance launch --mode headed'
On Windows
Native window system — headed instances work out of the box
bash
terminal
pinchtab  # Orchestrator
# Terminal 2:
pinchtab instance launch --mode headed
In Docker (Headless - Recommended)
# Headless works everywhere, no display needed
FROM pinchtab/pinchtab:latest
CMD ["pinchtab"]
Run with:

bash
terminal
docker run -d -p 9867:9867 pinchtab/pinchtab
# Create headless instances in the container
curl -X POST http://localhost:9867/instances/launch \
  -d '{"mode":"headless"}'
In Docker (Headed - Advanced)
# Headed requires display forwarding
FROM pinchtab/pinchtab:latest
ENV DISPLAY=:0
CMD ["pinchtab"]
Run with X11 forwarding:

bash
terminal
docker run \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
  -p 9867:9867 \
  pinchtab/pinchtab
# Create headed instances (display forwarded to host)
curl -X POST http://localhost:9867/instances/launch \
  -d '{"mode":"headed"}'
Best Practices
Development Workflow
bash
terminal
# Terminal 1: Start orchestrator (once)
pinchtab
# Terminal 2: Create headed instance for debugging
DEV=$(pinchtab instance launch --mode headed | jq -r '.id')
# Terminal 3: Build and test your automation
curl -X POST http://localhost:9867/instances/$DEV/navigate \
  -d '{"url":"https://example.com"}'
# Verify behavior in the visible window while you develop
# ... iterate on your script ...
# When stable, test in headless for production
PROD=$(pinchtab instance launch --mode headless)
# Run full test suite against headless instance
# ... verify all tests pass ...
# Clean up
pinchtab instance stop $DEV
pinchtab instance stop $PROD
CI/CD Pipeline
# Always headless in CI
test:
  script:
    # Start orchestrator
    - pinchtab &
    - sleep 1  # Wait for orchestrator to be ready
    
    # Create headless instance
    - INST=$(curl -X POST http://localhost:9867/instances/launch | jq -r '.id')
    - sleep 2  # Wait for instance to initialize
    
    # Run tests against headless instance
    - npm test
    
    # Cleanup
    - curl -X POST http://localhost:9867/instances/$INST/stop
    - pkill pinchtab
Multi-Instance Setup (Scale)
bash
terminal
# Terminal 1: Start orchestrator (once)
pinchtab
# Terminal 2: Create multiple headless instances for scale
for i in 1 2 3; do
  INST=$(pinchtab instance launch --mode headless | jq -r '.id')
  echo "Created headless instance: $INST"
done
# List all instances
curl http://localhost:9867/instances | jq .
# Response: 3 independent headless instances
# [
#   {"id": "inst_xxx", "port": "9868", "headless": true, "status": "running"},
#   {"id": "inst_yyy", "port": "9869", "headless": true, "status": "running"},
#   {"id": "inst_zzz", "port": "9870", "headless": true, "status": "running"}
# ]
# Terminal 3: Route requests to instances via orchestrator
# All operations go through: http://localhost:9867/instances/{id}/...
Multi-Instance with Mixed Modes
bash
terminal
# Terminal 1: Start orchestrator
pinchtab
# Create persistent profiles
pinchtab profile create alice
pinchtab profile create bob
pinchtab profile create dev
# Get profile IDs
ALICE_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="alice") | .id')
BOB_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="bob") | .id')
DEV_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="dev") | .id')
# Production: Multiple headless instances
ALICE_INST=$(curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$ALICE_ID'","mode":"headless"}' | jq -r '.id')
BOB_INST=$(curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$BOB_ID'","mode":"headless"}' | jq -r '.id')
# Development: One headed instance for debugging
DEV_INST=$(curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$DEV_ID'","mode":"headed"}' | jq -r '.id')
# Each instance is isolated with its own profile/cookies
Dashboard View of Mixed Instances
In the Profiles tab, you’ll see all your instances with their live Chrome windows:

Dashboard Profiles tab showing headed instance with real Chrome browser window displaying search results

The dashboard displays:

Left panel — Profile metadata (name, size, account, status)
Right panel — Live Chrome window when in headed mode
Status badge — Running instance on specific port
Port number — Where this instance is accessible via API
Each instance is completely isolated — different profiles, different cookies, different Chrome processes, different ports.

Performance Tips
For Headless Instances (Already Optimized)
Headless is the default and already optimized
Most operations are fast
For high-throughput: Create multiple headless instances and load-balance
For Headed Instances (Optimize for Dev)
Close unused tabs to reduce rendering load
Use snapshots instead of screenshots when possible (faster)
Take screenshots sparingly (they’re rendered + encoded, slower)
Minimize window size (less to render)
For faster debugging: Use headless for bulk work, headed only for visual debugging
For Scale
Use headless instances (no display overhead)
Create multiple instances (one per worker/agent)
Load-balance via /instances list and round-robin routing
Monitor instance health via GET /instances/{id}
Monitoring Instance Activity
The Pinchtab dashboard includes an Agents tab that shows all activity happening across your instances in real-time:

Dashboard Agents tab showing real-time activity feed of instance operations

The activity feed displays:

Timestamp — When the operation occurred
Agent/User — Which client made the request
Method — GET, POST, etc.
Endpoint — Which API endpoint was called
Timing — How long the operation took
Status — HTTP response code (200, 404, 500, etc.)
Use the activity feed to:

Monitor what your agents are doing in real-time
Debug failed operations (check status codes)
Understand performance (see timing metrics)
Track all API calls across all instances
Filter by operation type (Navigate, Snapshot, Actions, All) to focus on specific actions.

Troubleshooting
Headed Instance Not Opening a Window
Root cause: Display server not available

On Linux:

bash
terminal
# Check if DISPLAY is set
echo $DISPLAY
# If empty or :0 unavailable, you need X11 or Wayland
# Fallback to headless: Use --mode headless instead
pinchtab instance launch --mode headless
On macOS/Windows:

Verify Chrome/Chromium is installed
Verify OS has native display server
Headed Instance Too Slow
Solution: Use headless for production, headed only for development

bash
terminal
# Switch from headed to headless
INST=$(pinchtab instance launch --mode headed)
# ... do some debugging ...
pinchtab instance stop $INST
# Create headless for production testing
INST=$(pinchtab instance launch --mode headless)
Headless Instance But Need to Debug
Solution: Use API operations to see what’s happening

bash
terminal
# Get page structure (DOM)
curl http://localhost:9867/instances/$INST/snapshot | jq .
# Extract all text
curl http://localhost:9867/instances/$INST/text
# Take screenshot
TAB_ID=$(curl -s http://localhost:9867/instances/$INST/tabs | jq -r '.[0].id')
curl "http://localhost:9867/tabs/$TAB_ID/screenshot" > page.png
# Get page title and URL
curl http://localhost:9867/instances/$INST/tabs | jq '.[] | {title, url}'
Instance Initialization Slow
Symptom: Instance stuck in “starting” state

Solution: Wait for instance to reach “running” state before making requests

bash
terminal
# Check instance status
curl http://localhost:9867/instances/$INST | jq '.status'
# Poll until running (first request initializes Chrome: 5-20 seconds)
while [ "$(curl -s http://localhost:9867/instances/$INST | jq -r '.status')" != "running" ]; do
  sleep 0.5
done
# Now safe to use
curl -X POST http://localhost:9867/instances/$INST/navigate \
  -d '{"url":"https://example.com"}'
Can’t Connect to Instance
Symptom: 503 error when trying to navigate/snapshot

Causes:

Instance still initializing (check status)
Chrome crashed (check logs)
Port already in use (specify different port)
Debug:

bash
terminal
# Get instance status and error details
curl http://localhost:9867/instances/$INST | jq .
# Get instance logs
curl http://localhost:9867/instances/$INST/logs
# Check if port is available
lsof -i :9868  # Shows what's using the port




Dashboard
PinchTab includes a built-in web dashboard for monitoring and managing instances, profiles, and agent activity.

Access the dashboard at http://localhost:9867 (adjust port if needed).

Alternatively, use http://localhost:9867/dashboard (also works for backward compatibility).

Dashboard Overview
The dashboard provides four main screens:

Instances — View and manage running Chrome instances
Profiles — Browse and launch saved browser profiles
Profile Details — Configure and launch a specific profile
Agents Feed — Monitor agent activity and automation workflows
Instances Screen
Screenshot placeholder: Instances view

What It Shows
List of all running PinchTab instances
Port number for each instance
Instance status (running, stopped, idle)
Number of tabs in each instance
Profile name (if any) for each instance
What You Can Do
View details — Click an instance to see full information
Create new instance — Start a new Chrome process
Stop instance — Shut down a running instance
View tabs — See all tabs open in the instance
Use Cases
Monitor multiple instances running in parallel
Check resource usage per instance
Stop instances when no longer needed
Debug instance configuration
Profiles Screen
Screenshot placeholder: Profiles view

What It Shows
Grid of all available browser profiles
Each profile card displays:
Profile name
Associated email/account (if available)
Last used timestamp
Current status (running, stopped)
Quick info (cookies count, stored data size)
What You Can Do
Launch profile — Start a new instance with this profile
View details — Click profile card to see configuration details
Edit profile — Modify profile settings (name, metadata)
Delete profile — Remove a profile (with confirmation)
Search/filter — Find profiles by name or account
Use Cases
Quickly launch a profile for a specific user account
Switch between different login contexts
See which profiles are currently active
Manage multiple user sessions
Profile Details Screen
Screenshot placeholder: Profile details view

What It Shows
Profile name — Editable identifier
Account info — Associated email, username, or account ID
Launch settings:
Headless or headed mode
Port assignment
Stealth level (light, medium, full)
Environment variables
State info:
Created date
Last modified
Data size (cookies, storage, cache)
Number of saved tabs
Instances using this profile — Currently running instances
What You Can Do
Launch — Start a new instance with this profile
Edit — Modify profile configuration
View data — See stored cookies, local storage, browsing history
Clear data — Reset cookies/cache while keeping profile
Export — Backup profile configuration
Delete — Remove profile entirely
Use Cases
Configure launch options before starting an instance
Check what data is stored in a profile
Clone a profile for a similar use case
Debug profile-related issues
Agents Feed Screen
Screenshot placeholder: Agents feed view

What It Shows
Real-time activity log from all connected agents
Each entry displays:
Timestamp
Agent name/ID
Action performed (navigated, clicked, extracted text, etc.)
Associated instance/profile
Result (success, error, pending)
What You Can Do
Monitor agents — Watch what automation is happening in real-time
Filter by agent — Show only activity from a specific agent
Filter by instance — Show only activity in a specific instance
Search — Find activities by action, URL, or data
View details — Click an entry to see full request/response
Pause/resume — Control logging verbosity
Use Cases
Debug agent automation workflows
Audit what agents have done
Monitor for errors or unexpected behavior
Understand which agents are most active
Troubleshoot automation issues
Navigation
The dashboard header provides tabs to switch between screens:

[Instances] | [Profiles] | [Profile Details] | [Agents]
You can also navigate by clicking:

An instance → shows its details
A profile → shows its profile details screen
An agent event → shows relevant instance/profile
Status Indicators
Instance Status
Running (green) — Active Chrome process
Idle (yellow) — Running but no tabs
Stopped (red) — Process not running
Profile Status
Active (green) — At least one instance using it
Dormant (gray) — No active instances
Launching (blue) — Instance starting
Agent Status
Success (green) — Action completed
Error (red) — Action failed
Pending (yellow) — In progress
Cancelled (gray) — Aborted
Keyboard Shortcuts
Shortcut	Action
R	Refresh current screen
Esc	Go back / Close modal
Ctrl+K	Search
Ctrl+1	Instances tab
Ctrl+2	Profiles tab
Ctrl+3	Profile Details tab
Ctrl+4	Agents Feed tab
Dark Mode
The dashboard automatically uses your system’s dark/light preference.

Toggle manually:

Click the theme toggle in the top-right corner (sun/moon icon)
Preference is saved in browser local storage
Performance & Limits
Refresh rate: Real-time updates (WebSocket-based)
History retention: Last 1000 agent events (older events archived)
Scalability: Optimized for 10+ instances, 100+ profiles
For high-throughput monitoring, consider using the REST API directly:

bash
terminal
# Get all instances
curl http://localhost:9867/instances
# Get all profiles
curl http://localhost:9867/profiles
# Stream agent events
curl http://localhost:9867/events/stream
Troubleshooting
Dashboard Not Loading
Check if PinchTab is running: curl http://localhost:9867/health
Check the port: Default is 9867, adjust if you started with --port
Clear browser cache: Ctrl+Shift+Delete (most browsers)
No Instances Showing
Make sure at least one instance is running: pinchtab --port 9867
Refresh the page (R key)
Check browser console for errors (F12)
Agent Events Not Updating
Confirm agents are actually running tasks
Check WebSocket connection: Open DevTools → Network → WS tab
Try refreshing the page







Quick Start (5 Minutes)
Step 1: Start the Orchestrator
Terminal 1:

bash
terminal
pinchtab
Expected output:

🦀 Pinchtab Dashboard port=9867
dashboard ready url=http://localhost:9867/dashboard
The orchestrator is running on http://127.0.0.1:9867. Open the dashboard in your browser to see instances and profiles.

Step 2: Create an Instance
Terminal 2:

bash
terminal
# Create a headless instance (background Chrome)
INST=$(pinchtab instance launch --mode headless | jq -r '.id')
echo "Instance created: $INST"
# Wait for Chrome to initialize (~2-5 seconds)
sleep 3
Step 3: Run Your First Command
bash
terminal
# Navigate to a website
pinchtab instance navigate $INST https://example.com
# Get page structure
curl http://localhost:9867/tabs/$TAB_ID/snapshot | jq '.nodes | map({role, name}) | .[0:5]'
# Extract text
curl http://localhost:9867/tabs/$TAB_ID/text | jq '.text'
✅ You’re running PinchTab!

Common First Commands
Get Page Content
bash
terminal
INST=$(pinchtab instance launch | jq -r '.id')
sleep 2
# Navigate
TAB_ID=$(curl -s -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com"}' | jq -r '.id')
# Read the page as text
curl http://localhost:9867/tabs/$TAB_ID/text
# Get interactive elements (snapshot)
curl http://localhost:9867/tabs/$TAB_ID/snapshot | jq '.nodes | map({ref, role, name})'
Take a Screenshot
bash
terminal
# Save screenshot for a specific tab
curl "http://localhost:9867/tabs/$TAB_ID/screenshot" -o page.png
Export as PDF
bash
terminal
# Save PDF
curl "http://localhost:9867/tabs/$TAB_ID/pdf?landscape=true" -o output.pdf
Interact with the Page
bash
terminal
# Get page structure (snapshot)
SNAPSHOT=$(curl http://localhost:9867/tabs/$TAB_ID/snapshot)
# Extract a reference (e.g., first button)
BUTTON_REF=$(echo "$SNAPSHOT" | jq -r '.nodes[] | select(.role=="button") | .ref' | head -1)
# Click the button
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -H "Content-Type: application/json" \
  -d '{"kind":"click","ref":"'$BUTTON_REF'"}'
# Or fill a form input
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -H "Content-Type: application/json" \
  -d '{"kind":"fill","ref":"e3","text":"user@example.com"}'
Multiple Tabs
bash
terminal
# Create new tab in instance
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'
# List all tabs
curl http://localhost:9867/tabs
# Operate on specific tab
TAB_ID=$(curl http://localhost:9867/instances/$INST/tabs | jq -r '.[0].id')
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"click","ref":"e5","tabId":"'$TAB_ID'"}'
Understanding the Workflow
Key Concepts
Orchestrator (port 9867):

Manages instances
Routes requests via /instances/{id}/*
No Chrome process itself
Instance (ports 9868-9968):

Real Chrome browser process
Has one or more tabs
Isolated cookies, history, storage
Each has unique ID: inst_XXXXXXXX
Tab:

Single webpage within instance
Has state (URL, DOM, focus, content)
Unique ID: tab_XXXXXXXX
Typical Workflow
bash
terminal
# 1. Create instance (Chrome starts lazily on first request)
INST=$(pinchtab instance launch | jq -r '.id')
sleep 2
# 2. Navigate to a page
TAB_ID=$(curl -s -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com"}' | jq -r '.id')
# 3. Get page structure (see buttons, links, inputs)
curl http://localhost:9867/tabs/$TAB_ID/snapshot
# 4. Interact with page (click, type, etc.)
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"click","ref":"e5"}'
# 5. Verify changes
curl http://localhost:9867/tabs/$TAB_ID/snapshot
# 6. Capture result
curl "http://localhost:9867/tabs/$TAB_ID/screenshot" -o page.png
curl "http://localhost:9867/tabs/$TAB_ID/pdf" -o report.pdf
# 7. Stop instance (clean up)
curl -X POST http://localhost:9867/instances/$INST/stop
Using with curl (HTTP API)
You don’t need the CLI. PinchTab is HTTP:

bash
terminal
# Health check
curl http://localhost:9867/health
# Create instance
INST=$(curl -s -X POST http://localhost:9867/instances/launch | jq -r '.id')
sleep 2
# Navigate
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Get snapshot
curl http://localhost:9867/tabs/$TAB_ID/snapshot
# Extract text
curl http://localhost:9867/tabs/$TAB_ID/text
# Stop instance
curl -X POST http://localhost:9867/instances/$INST/stop
Full API reference → curl-commands.md
Instance API details → instance-api.md

Using with Python
import requests
import json
import time

BASE = "http://localhost:9867"

# 1. Create instance
resp = requests.post(f"{BASE}/instances/launch", json={"mode": "headless"})
inst_id = resp.json()["id"]
print(f"Created instance: {inst_id}")

# Wait for Chrome to initialize
time.sleep(2)

# 2. Create tab by navigating
resp = requests.post(f"{BASE}/instances/{inst_id}/tabs/open", json={
    "url": "https://example.com"
})
tab_id = resp.json()["id"]
print(f"Navigated: {resp.json()}")

# 3. Get snapshot
snapshot = requests.get(f"{BASE}/tabs/{tab_id}/snapshot").json()

# Print interactive elements
for elem in snapshot.get("nodes", []):
    if elem.get("role") in ["button", "link"]:
        print(f"{elem['ref']}: {elem['role']} - {elem['name']}")

# 4. Click an element
requests.post(f"{BASE}/tabs/{tab_id}/action", json={
    "action": "click",
    "ref": "e5"
})

# 5. Get text
text = requests.get(f"{BASE}/tabs/{tab_id}/text").json()
print(f"Page text: {text['text'][:200]}...")

# 6. Stop instance
requests.post(f"{BASE}/instances/{inst_id}/stop")
print(f"Stopped instance: {inst_id}")
Using with Node.js
const fetch = require('node-fetch');

const BASE = "http://localhost:9867";

async function main() {
  try {
    // 1. Create instance
    const launchResp = await fetch(`${BASE}/instances/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "headless" })
    });
    const launch = await launchResp.json();
    const instId = launch.id;
    console.log(`Created instance: ${instId}`);

    // Wait for Chrome to initialize
    await new Promise(r => setTimeout(r, 2000));

    // 2. Create tab by navigating
    const navResp = await fetch(`${BASE}/instances/${instId}/tabs/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com"
      })
    });
    const navData = await navResp.json();
    const tabId = navData.id;

    // 3. Get snapshot
    const snapResp = await fetch(`${BASE}/tabs/${tabId}/snapshot`);
    const snap = await snapResp.json();

    // Print interactive elements
    snap.nodes
      .filter(n => ["button", "link"].includes(n.role))
      .forEach(n => console.log(`${n.ref}: ${n.role} - ${n.name}`));

    // 4. Click element
    await fetch(`${BASE}/tabs/${tabId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "click",
        ref: "e5"
      })
    });

    // 5. Get text
    const textResp = await fetch(`${BASE}/tabs/${tabId}/text`);
    const text = await textResp.json();
    console.log(`Page text: ${text.text.substring(0, 200)}...`);

    // 6. Stop instance
    await fetch(`${BASE}/instances/${instId}/stop`, {
      method: "POST"
    });
    console.log(`Stopped instance: ${instId}`);

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
Configuration
Orchestrator Configuration
bash
terminal
# Custom port (orchestrator)
BRIDGE_PORT=9868 pinchtab
# Auth token for remote access
BRIDGE_TOKEN=my-secret-token pinchtab
# Bind to all interfaces (for remote access)
BRIDGE_BIND=0.0.0.0 pinchtab
# Custom Chrome binary (used by all instances)
CHROME_BIN=/usr/bin/google-chrome pinchtab
Instance Configuration
Instance-specific options are set when creating instances:

bash
terminal
# Headless (default, fastest)
pinchtab instance launch --mode headless
# Headed (visible window, for debugging)
pinchtab instance launch --mode headed
# Specific port (usually auto-allocated)
pinchtab instance launch --port 9999
# With persistent profile
pinchtab profile create work
PROF_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="work") | .id')
curl -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$PROF_ID'","mode":"headed"}'
Full configuration →

Common Scenarios
Scenario 1: Scrape a Website
bash
terminal
# Create instance
INST=$(pinchtab instance launch | jq -r '.id')
sleep 2
# Navigate
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com/article"}'
# Extract text
curl http://localhost:9867/tabs/$TAB_ID/text | jq '.text'
# Save to file
curl http://localhost:9867/tabs/$TAB_ID/text | jq -r '.text' > article.txt
# Stop instance
curl -X POST http://localhost:9867/instances/$INST/stop
Scenario 2: Fill and Submit a Form
bash
terminal
# Create instance
INST=$(pinchtab instance launch | jq -r '.id')
sleep 2
# Navigate to form
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com/contact"}'
# Get form structure
SNAP=$(curl http://localhost:9867/tabs/$TAB_ID/snapshot)
# Fill fields (get refs from snapshot)
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"fill","ref":"e3","text":"John Doe"}'
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"fill","ref":"e5","text":"john@example.com"}'
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"fill","ref":"e7","text":"My message here"}'
# Click submit
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"click","ref":"e10"}'
# Verify success
curl http://localhost:9867/tabs/$TAB_ID/snapshot | jq '.nodes | length'
Scenario 3: Login + Stay Logged In
bash
terminal
# Create persistent profile
pinchtab profile create mylogin
PROF_ID=$(pinchtab profiles | jq -r '.[] | select(.name=="mylogin") | .id')
# Start instance with profile
INST=$(curl -s -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$PROF_ID'"}' | jq -r '.id')
sleep 2
# Login
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com/login"}'
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"fill","ref":"e3","text":"user@example.com"}'
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"fill","ref":"e5","text":"password"}'
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"click","ref":"e7"}'
# Stop instance (profile saved)
curl -X POST http://localhost:9867/instances/$INST/stop
# Later: restart with same profile (already logged in!)
INST=$(curl -s -X POST http://localhost:9867/instances/start \
  -d '{"profileId":"'$PROF_ID'"}' | jq -r '.id')
sleep 2
# Navigate to dashboard (cookies preserved)
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com/dashboard"}'
Scenario 4: Generate PDF Report
bash
terminal
# Create instance
INST=$(pinchtab instance launch | jq -r '.id')
sleep 2
TAB_ID=$(curl -s -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://reports.example.com/monthly"}' | jq -r '.id')
# Export PDF
curl "http://localhost:9867/tabs/$TAB_ID/pdf?landscape=true" -o report.pdf
Scenario 5: Multi-Tab Workflow
bash
terminal
# Create instance
INST=$(pinchtab instance launch | jq -r '.id')
sleep 2
# Open first tab (source)
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://source.example.com"}'
# Open second tab (destination)
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://destination.example.com"}'
# List tabs
TABS=$(curl http://localhost:9867/instances/$INST/tabs)
SOURCE_TAB=$(echo "$TABS" | jq -r '.[0].id')
DEST_TAB=$(echo "$TABS" | jq -r '.[1].id')
# Extract from source tab
DATA=$(curl "http://localhost:9867/tabs/$TAB_ID/text" | jq -r '.text')
# Fill destination tab
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -H "Content-Type: application/json" \
  -d '{"kind":"fill","ref":"e3","text":"'$DATA'","tabId":"'$DEST_TAB'"}'
Troubleshooting
”connection refused” / “Cannot connect”
Problem: Orchestrator not running

Solution:

bash
terminal
# Terminal 1: Start orchestrator
pinchtab
# Terminal 2: Check health (once running)
curl http://localhost:9867/health
“Instance stuck in ‘starting’ state”
Problem: Chrome takes time to initialize (8-20 seconds)

Solution:

bash
terminal
# Poll instance status
INST=$(pinchtab instance launch | jq -r '.id')
# Wait until 'running'
while [ "$(curl -s http://localhost:9867/instances/$INST | jq -r '.status')" != "running" ]; do
  sleep 0.5
done
# Now safe to use
curl -X POST http://localhost:9867/instances/$INST/tabs/open \
  -d '{"url":"https://example.com"}'
“Port already in use”
Problem: Port 9867 (or instance port) is taken

Solution:

bash
terminal
# Use different orchestrator port
BRIDGE_PORT=9868 pinchtab
# Or kill the process using 9867
lsof -i :9867
kill -9 <PID>
# Instance ports auto-allocated from 9868-9968, no manual config needed
“Chrome not found”
Problem: Chrome/Chromium not installed

Solution:

bash
terminal
# macOS
brew install chromium
# Linux (Ubuntu/Debian)
sudo apt install chromium-browser
# Or specify custom Chrome
CHROME_BIN=/path/to/chrome pinchtab
“Empty snapshot / 404 error”
Problem: Instance ID is invalid or instance was stopped

Solution:

bash
terminal
# List running instances
curl http://localhost:9867/instances
# Use valid instance ID
INST=$(pinchtab instance launch | jq -r '.id')
# Verify it's running
curl http://localhost:9867/instances/$INST
“ref e5 not found”
Problem: Page updated or different page loaded

Solution:

bash
terminal
# Get fresh snapshot
SNAP=$(curl http://localhost:9867/tabs/$TAB_ID/snapshot)
# Extract new ref from snapshot
NEW_REF=$(echo "$SNAP" | jq -r '.nodes[] | select(.role=="button") | .ref' | head -1)
# Use new ref
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"click","ref":"'$NEW_REF'"}'
Common Features
Extract Text Efficiently
bash
terminal
# Get text content
curl http://localhost:9867/tabs/$TAB_ID/text
# Get snapshot (DOM structure)
curl http://localhost:9867/tabs/$TAB_ID/snapshot
# Filter snapshot to interactive elements
curl http://localhost:9867/tabs/$TAB_ID/snapshot | \
  jq '.nodes[] | select(.role | IN("button", "link", "textbox"))'
Interact with Page
bash
terminal
# Click element
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"click","ref":"e5"}'
# Type text
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"type","ref":"e3","text":"hello"}'
# Fill input
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"fill","ref":"e3","text":"value"}'
# Press key
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"press","key":"Enter"}'
# Focus element
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"focus","ref":"e5"}'
# Hover element
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"hover","ref":"e5"}'
# Select dropdown
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -d '{"kind":"select","ref":"e8","text":"Option 2"}'
Run JavaScript
bash
terminal
# Evaluate expression
curl -X POST http://localhost:9867/instances/$INST/evaluate \
  -H "Content-Type: application/json" \
  -d '{"expression":"document.title"}'
# Get page info
curl -X POST http://localhost:9867/instances/$INST/evaluate \
  -H "Content-Type: application/json" \
  -d '{"expression":"JSON.stringify({title: document.title, url: location.href})"}'
Performance Tips
Use Headless for Speed
bash
terminal
# Headless (default, faster)
pinchtab instance launch --mode headless
# Headed (visible window, slower, better for debugging)
pinchtab instance launch --mode headed
Parallel Processing
bash
terminal
# Create multiple instances for concurrent work
for i in 1 2 3 4 5; do
  INST=$(pinchtab instance launch | jq -r '.id')
  INSTANCES+=("$INST")
done
# Distribute work across instances (round-robin)
for URL in "${URLS[@]}"; do
  INST="${INSTANCES[$((INDEX % 5))]}"
  curl -X POST "http://localhost:9867/instances/$INST/tabs/open" \
    -d '{"url":"'$URL'"}' &
  ((INDEX++))
done
wait
Token Efficiency
bash
terminal
# Use text extraction (cheaper than screenshots)
curl http://localhost:9867/tabs/$TAB_ID/text      # Lower tokens
# Use snapshot (cheaper than screenshot)
curl http://localhost:9867/tabs/$TAB_ID/snapshot  # Lower tokens
# Screenshots are expensive (JPG encoding)
curl "http://localhost:9867/tabs/$TAB_ID/screenshot" # Higher tokens
Quick Reference
Task	Command
Start orchestrator	pinchtab
Health check	curl http://localhost:9867/health
Create instance	INST=$(pinchtab instance launch | jq -r '.id')
Navigate	curl -X POST http://localhost:9867/instances/$INST/tabs/open -d '{"url":"..."}'
See structure	curl http://localhost:9867/tabs/$TAB_ID/snapshot
Get text	curl http://localhost:9867/tabs/$TAB_ID/text
Click element	curl -X POST http://localhost:9867/tabs/$TAB_ID/action -d '{"kind":"click","ref":"e5"}'
Type text	curl -X POST http://localhost:9867/tabs/$TAB_ID/action -d '{"kind":"type","ref":"e3","text":"hello"}'
Screenshot	curl "http://localhost:9867/tabs/$TAB_ID/screenshot" -o page.png
PDF export	curl http://localhost:9867/tabs/$TAB_ID/pdf -o out.pdf
List instances	curl http://localhost:9867/instances
List tabs	curl http://localhost:9867/instances/$INST/tabs
New tab	curl -X POST http://localhost:9867/instances/$INST/tabs/open -d '{"url":"..."}'
Stop instance	curl -X POST http://localhost:9867/instances/$INST/stop





Overview
Resource Hierarchy
Architecture Diagram
ASCII
Profile
  ↓ (create instance with profile)
Instance (orchestrator resource)
  ↓ (create tab in instance)
Tab (primary resource - where all work happens)
  ├─ Navigate
  ├─ Snapshot
  ├─ Action / Actions
  ├─ Text
  ├─ Evaluate
  ├─ Screenshot
  ├─ PDF
  ├─ Cookies
  ├─ Lock / Unlock
  └─ Close
Complete Endpoint List
Profile Management
Method	Path	Payload	Response	Purpose
GET	/profiles	-	[{id, name, createdAt, usedAt}]	List profiles
POST	/profiles	{name}	{id, name, createdAt}	Create profile
GET	/profiles/{id}	-	{id, name, createdAt, usedAt}	Get profile info
DELETE	/profiles/{id}	-	{id, deleted: true}	Delete profile
Instance Management
Method	Path	Payload	Response	Purpose
GET	/instances	-	[{id, profileId, port, mode, status, startTime}]	List instances
GET	/instances/{id}	-	{id, profileId, port, mode, status, startTime}	Get instance status (read-only)
POST	/instances/start	{profileId?, mode?, port?}	{id, profileId, port, mode, status}	Start instance
POST	/instances/{id}/start	-	{status: "chrome_ready"} or {id, profileId, port, mode, status}	Start browser for existing instance
POST	/instances/{id}/stop	-	{id, stopped: true}	Stop instance
GET	/instances/{id}/logs	-	text	Get instance logs
Tab Management (NEW)
Method	Path	Payload	Response	Purpose
POST	/tabs/new	{instanceId, url?}	{id, instanceId, url?, status}	Create tab
GET	/tabs	-	[{id, instanceId, url, title, type}]	List all tabs
GET	/tabs?instanceId={id}	-	[{id, instanceId, url, title}]	List instance tabs
GET	/tabs/{id}	-	{id, instanceId, url, title, type, status}	Get tab info
POST	/tabs/{id}/close	-	{id, closed: true}	Close tab
Tab Operations (NEW - Replaces /instances/{id}/…)
Method	Path	Query/Body	Response	Purpose
NAVIGATE				
POST	/tabs/{id}/navigate	{url, timeout?, blockImages?, blockAds?}	{url, status, title}	Navigate to URL
SNAPSHOT				
GET	/tabs/{id}/snapshot	?interactive&compact&depth=3&maxTokens=2000	{elements: [], tree: ...}	Page structure
ACTION				
POST	/tabs/{id}/action	{kind, ref?, text?, key?, value?, ...}	{kind, result?, error?}	Single action
POST	/tabs/{id}/actions	{actions: [{kind, ...}, ...]}	{results: [...]}	Multiple actions
TEXT & EVALUATION				
GET	/tabs/{id}/text	?raw	{text: "...", elements: [...]}	Extract text
POST	/tabs/{id}/evaluate	{expression, await?}	{result: any, type: string}	Run JS
MEDIA				
GET	/tabs/{id}/screenshot	?format=png&quality=80	binary (PNG/JPEG)	Screenshot
GET	/tabs/{id}/pdf	?landscape&margins=0.5&scale=1.0&pages=1-3	binary (PDF)	PDF export
COOKIES				
GET	/tabs/{id}/cookies	-	[{name, value, domain, ...}]	Get cookies
POST	/tabs/{id}/cookies	`{action: “set"	"delete”, cookies: […]}`	{set: [...], deleted: [...]}
LOCKING				
POST	/tabs/{id}/lock	{owner: string, ttl: number}	{locked: true, owner, expiresAt}	Lock tab
POST	/tabs/{id}/unlock	{owner: string}	{unlocked: true}	Unlock tab
GET	/tabs/{id}/locks	-	{locked: bool, owner?, expiresAt?}	Check lock
FINGERPRINTING				
POST	/tabs/{id}/fingerprint/rotate	-	{rotated: true, userAgent, ...}	Rotate fingerprint
GET	/tabs/{id}/fingerprint/status	-	`{stealth: “light"	"full”, ua, …}`
Comparison: Old vs New
Example 1: Click Element
OLD (instance-scoped):

bash
terminal
curl -X POST http://localhost:9867/instances/inst_abc123/action \
  -d '{"kind": "click", "ref": "e5"}'
Requires instance ID
Path has 3 segments
NEW (tab-scoped):

bash
terminal
curl -X POST http://localhost:9867/tabs/tab_xyz789/action \
  -d '{"kind": "click", "ref": "e5"}'
Requires tab ID (which identifies instance)
Path has 2 segments
Cleaner for multi-tab workflows
Example 2: Navigate to URL
OLD:

bash
terminal
curl -X POST http://localhost:9867/instances/inst_abc123/navigate \
  -d '{"url": "https://example.com"}'
NEW:

bash
terminal
curl -X POST http://localhost:9867/tabs/tab_xyz789/navigate \
  -d '{"url": "https://example.com"}'
Example 3: Create Tab
OLD:

bash
terminal
curl -X POST http://localhost:9867/instances/inst_abc123/tabs/open \
  -d '{}'
# Response: {id: "tab_xyz", ...}
NEW:

bash
terminal
curl -X POST http://localhost:9867/tabs/new \
  -d '{"instanceId": "inst_abc123"}'
# Response: {id: "tab_xyz", ...}
Example 4: List tabs
OLD:

bash
terminal
curl http://localhost:9867/instances/inst_abc123/tabs
# Returns just tabs from that instance
NEW:

bash
terminal
# All tabs (across instances)
curl http://localhost:9867/tabs
# Specific instance
curl http://localhost:9867/tabs?instanceId=inst_abc123
Query Parameters vs Body
Query Parameters (GET)
bash
terminal
# Snapshot with options
curl 'http://localhost:9867/tabs/tab_xyz/snapshot?interactive&compact&depth=2&maxTokens=2000'
# Screenshot with format
curl 'http://localhost:9867/tabs/tab_xyz/screenshot?format=jpeg&quality=85'
# List with filter
curl 'http://localhost:9867/tabs?instanceId=inst_abc123'
Body (POST)
bash
terminal
# Navigate with options
curl -X POST http://localhost:9867/tabs/tab_xyz/navigate \
  -d '{
    "url": "https://example.com",
    "timeout": 30,
    "blockImages": true,
    "blockAds": false
  }'
# Action (already body-based)
curl -X POST http://localhost:9867/tabs/tab_xyz/action \
  -d '{
    "kind": "click",
    "ref": "e5",
    "timeout": 5
  }'
HTTP Status Codes
Code	Meaning	Example
200	Success (GET/action)	Snapshot returned, action completed
201	Created	Tab created, instance started
204	No content	Close successful
400	Bad request	Invalid action kind, malformed JSON
404	Not found	Tab ID doesn’t exist, instance stopped
409	Conflict	Tab locked by another agent, port in use
500	Server error	Chrome crashed, internal error
503	Unavailable	Chrome not initialized, instance starting
Response Format
Success Response
{
  "kind": "action",
  "result": {
    "text": "Element text",
    "visible": true,
    "rect": {...}
  }
}
Error Response
{
  "error": "tab not found",
  "code": "ERR_TAB_NOT_FOUND",
  "statusCode": 404
}
Snapshot Response
{
  "elements": [
    {
      "ref": "e1",
      "tag": "button",
      "text": "Click me",
      "interactive": true,
      "rect": {"x": 100, "y": 50, "w": 80, "h": 30}
    }
  ],
  "tree": {...},
  "meta": {"count": 45, "interactive": 12}
}
CLI Command Mapping
Profile Management
bash
terminal
# List
pinchtab profiles
# Create
pinchtab profile create my-profile
# Delete
pinchtab profile delete my-profile
Instance Management
bash
terminal
# List
pinchtab instances
# Start
pinchtab instance start --profile my-profile --mode headed --port 9868
# Stop
pinchtab instance stop inst_abc123
# Logs
pinchtab instance logs inst_abc123
Tab Management
bash
terminal
# List all tabs
pinchtab tabs
# List instance tabs
pinchtab --instance inst_abc123 tabs
# Create tab
pinchtab --instance inst_abc123 tab new https://example.com
# → tab_xyz789
# Close tab
pinchtab --tab tab_xyz789 close
Tab Operations
bash
terminal
# Navigate
pinchtab --tab tab_xyz789 nav https://example.com
# Snapshot
pinchtab --tab tab_xyz789 snap -i -c
# Click
pinchtab --tab tab_xyz789 click e5
# Get text
pinchtab --tab tab_xyz789 text
# Run action
cat << 'EOF' | pinchtab --tab tab_xyz789 action
{
  "kind": "actions",
  "actions": [
    {"kind": "click", "ref": "e1"},
    {"kind": "type", "ref": "e2", "text": "search"},
    {"kind": "press", "key": "Enter"}
  ]
}
EOF
# Lock tab (exclusive access)
pinchtab --tab tab_xyz789 lock --owner my-agent --ttl 60
# Unlock
pinchtab --tab tab_xyz789 unlock --owner my-agent
Full Workflow Example
Setup
bash
terminal
# 1. Create profile
PROF=$(pinchtab profile create my-app | jq -r .id)
# 2. Start instance
INST=$(pinchtab instance start --profile my-app --mode headed | jq -r .id)
# 3. Create tab
TAB=$(pinchtab --instance $INST tab new | jq -r .id)
Work
bash
terminal
# 4. Navigate
pinchtab --tab $TAB nav https://example.com
# 5. Get page structure
pinchtab --tab $TAB snap -i -c | jq .
# 6. Interact
pinchtab --tab $TAB click e5
pinchtab --tab $TAB type e12 "search text"
pinchtab --tab $TAB press Enter
# 7. Check result
pinchtab --tab $TAB snap -d | jq .
# 8. Extract data
pinchtab --tab $TAB text
Cleanup
bash
terminal
# 9. Close tab (optional, instance cleanup closes all)
pinchtab --tab $TAB close
# 10. Stop instance
pinchtab instance stop $INST
Data Flow
Request Path
Architecture Diagram
ASCII
CLI Command
  ↓
HTTP Request (curl or SDK)
  ↓
Orchestrator Server (9867)
  ↓
Tab Resolver (tab ID → instance ID)
  ↓
Route to Instance (HTTP call to 9868+)
  ↓
Bridge Server
  ↓
Chrome (DevTools Protocol)
Response Path
Architecture Diagram
ASCII
Chrome responds
  ↓
Bridge returns JSON
  ↓
Instance Server returns JSON
  ↓
Orchestrator aggregates/proxies
  ↓
CLI/SDK receives JSON









CLI Quick Reference
Legend:

inst_abc123 — Instance ID
tab_xyz789 — Tab ID
e5 — Element reference (from snapshot)
Instance Management
Launch an instance
bash
terminal
# Headless (default)
pinchtab instance launch
# Headed (with window)
pinchtab instance launch --mode headed
# On specific port
pinchtab instance launch --port 9868
# Get instance ID
INST=$(pinchtab instance launch --mode headed | jq -r .id)
echo $INST  # inst_abc123
List running instances
bash
terminal
pinchtab instances
# Get just IDs
pinchtab instances | jq -r '.[] | .id'
# Get specific instance
pinchtab instances | jq '.[] | select(.id == "inst_abc123")'
Instance logs
bash
terminal
pinchtab instance inst_abc123 logs
# Follow logs (continuous)
pinchtab instance inst_abc123 logs | tail -f
# Last 100 lines
pinchtab instance inst_abc123 logs | tail -100
Stop instance
bash
terminal
pinchtab instance inst_abc123 stop
Browser Control (Single Instance)
Navigate
bash
terminal
# Default instance
pinchtab nav https://example.com
# Specific instance
pinchtab --instance inst_abc123 nav https://example.com
# Open in new tab
pinchtab --instance inst_abc123 nav https://example.com --new-tab
# Without images (faster)
pinchtab --instance inst_abc123 nav https://example.com --block-images
Snapshot page
bash
terminal
# Full page
pinchtab --instance inst_abc123 snap
# Interactive elements only
pinchtab --instance inst_abc123 snap -i
# Compact (token-efficient)
pinchtab --instance inst_abc123 snap -c
# Interactive + compact (best for AI)
pinchtab --instance inst_abc123 snap -i -c
# Only changes since last snapshot
pinchtab --instance inst_abc123 snap -d
# Save to file
pinchtab --instance inst_abc123 snap > page.json
# Parse in script
pinchtab --instance inst_abc123 snap -c | jq '.elements[] | .ref' | head -5
Click element
bash
terminal
pinchtab --instance inst_abc123 click e5
Type text
bash
terminal
pinchtab --instance inst_abc123 type e12 "hello world"
Fill input (directly, no events)
bash
terminal
pinchtab --instance inst_abc123 fill e12 "value"
Press key
bash
terminal
pinchtab --instance inst_abc123 press Enter
pinchtab --instance inst_abc123 press Tab
pinchtab --instance inst_abc123 press Escape
Scroll
bash
terminal
pinchtab --instance inst_abc123 scroll down
pinchtab --instance inst_abc123 scroll up
pinchtab --instance inst_abc123 scroll 500  # pixels
Get page text
bash
terminal
pinchtab --instance inst_abc123 text
# Raw text (no JSON wrapper)
pinchtab --instance inst_abc123 text --raw
Screenshot
bash
terminal
# To stdout (PNG)
pinchtab --instance inst_abc123 ss > screenshot.png
# To file
pinchtab --instance inst_abc123 ss -o out.png
# JPEG with quality
pinchtab --instance inst_abc123 ss -o out.jpg -q 85
PDF export
bash
terminal
# Default (A4 portrait)
pinchtab --instance inst_abc123 pdf -o out.pdf
# Landscape
pinchtab --instance inst_abc123 pdf -o out.pdf --landscape
# Letter size
pinchtab --instance inst_abc123 pdf -o out.pdf --paper-width 8.5 --paper-height 11
# Specific pages
pinchtab --instance inst_abc123 pdf -o out.pdf --page-ranges "1-3,5"
Run JavaScript
bash
terminal
pinchtab --instance inst_abc123 eval "document.title"
# JSON result
pinchtab --instance inst_abc123 eval "document.querySelectorAll('a').length"
# Complex script
pinchtab --instance inst_abc123 eval '
  JSON.stringify({
    title: document.title,
    url: location.href,
    links: document.querySelectorAll("a").length
  })
'
Tab Management
List tabs
bash
terminal
pinchtab --instance inst_abc123 tabs
# Get tab IDs
pinchtab --instance inst_abc123 tabs | jq -r '.tabs[] | .id'
# Count tabs
pinchtab --instance inst_abc123 tabs | jq '.tabs | length'
Create tab
bash
terminal
# Create and get ID
TAB=$(pinchtab --instance inst_abc123 tab create https://example.com | jq -r .id)
echo $TAB  # tab_xyz789
Navigate specific tab
bash
terminal
pinchtab --instance inst_abc123 tab tab_xyz789 navigate https://google.com
Close tab
bash
terminal
pinchtab --instance inst_abc123 tab tab_xyz789 close
Lock tab (prevent concurrent access)
bash
terminal
# Lock for 60 seconds
pinchtab --instance inst_abc123 tab tab_xyz789 lock --owner my-agent --ttl 60
# After work, unlock
pinchtab --instance inst_abc123 tab tab_xyz789 unlock --owner my-agent
Complex Actions
Multi-step workflow (JSON stdin)
bash
terminal
cat << 'EOF' | pinchtab --instance inst_abc123 action
{
  "kind": "actions",
  "actions": [
    {"kind": "click", "ref": "e1"},
    {"kind": "type", "ref": "e2", "text": "search query"},
    {"kind": "press", "key": "Enter"},
    {"kind": "wait", "time": 2000},
    {"kind": "click", "ref": "e5"}
  ]
}
EOF
From file
bash
terminal
# Create actions file
cat > actions.json << 'EOF'
{
  "kind": "actions",
  "actions": [
    {"kind": "click", "ref": "e1"},
    {"kind": "type", "ref": "e2", "text": "hello"},
    {"kind": "press", "key": "Enter"}
  ]
}
EOF
# Run it
pinchtab --instance inst_abc123 action -f actions.json
From inline JSON
bash
terminal
pinchtab --instance inst_abc123 action --json '{"kind":"click","ref":"e5"}'
Typical Workflow
1. Start orchestrator
bash
terminal
# Terminal 1: Start the dashboard/orchestrator
pinchtab
# Now listening on http://localhost:9867
2. Launch instance
bash
terminal
# Terminal 2: Launch a headed instance
INST=$(pinchtab instance launch --mode headed | jq -r .id)
echo "Instance: $INST"
3. Navigate and interact
bash
terminal
# Navigate to website
pinchtab --instance $INST nav https://github.com/pinchtab/pinchtab
# See page structure
pinchtab --instance $INST snap -i -c | jq .
# Click button (find e5 from snapshot)
pinchtab --instance $INST click e5
# See result
pinchtab --instance $INST snap -i -c | jq '.elements[] | select(.ref == "e5")'
4. Extract data
bash
terminal
# Get all visible text
pinchtab --instance $INST text --raw
# Count links
pinchtab --instance $INST eval 'document.querySelectorAll("a").length'
# Export page
pinchtab --instance $INST pdf -o page.pdf
5. Cleanup
bash
terminal
# Stop instance
pinchtab instance $INST stop
# Verify stopped
pinchtab instances
Scripting Examples
Batch instances
bash
terminal
# Launch 3 instances
for i in {1..3}; do
  PORT=$((9868 + i))
  INST=$(pinchtab instance launch --mode headed --port $PORT | jq -r .id)
  echo "Instance $i: $INST"
done
Parallel navigation
bash
terminal
# Navigate multiple instances concurrently
for inst in $(pinchtab instances | jq -r '.[] | .id'); do
  (pinchtab --instance $inst nav https://example.com) &
done
wait
echo "All instances navigated"
Monitor instances
bash
terminal
# Watch instance status
while true; do
  clear
  pinchtab instances | jq -r '.[] | "\(.id) (\(.mode)): \(.status)"'
  sleep 2
done
Cleanup all instances
bash
terminal
# Stop all instances
pinchtab instances | jq -r '.[] | .id' | xargs -I {} pinchtab instance {} stop
Troubleshooting
Check server status
bash
terminal
pinchtab health
# Should print: {"status": "ok"}
View server logs
bash
terminal
# If running in foreground, Ctrl+C to see logs
# If running in background:
jobs
fg  # bring to foreground
Instance not starting?
bash
terminal
# Check logs
pinchtab instance inst_abc123 logs | tail -50
# Check port availability
lsof -i :9868
Can’t connect to instance?
bash
terminal
# Verify instance is running
pinchtab instances | jq '.[] | select(.id == "inst_abc123")'
# Check status
pinchtab instances | jq '.[] | select(.id == "inst_abc123") | .status'
# Should be "running"
Need to specify server address?
bash
terminal
# For remote server
export PINCHTAB_URL=http://192.168.1.100:9867
# Or per-command (coming soon)
pinchtab --server http://192.168.1.100:9867 instances
Environment Variables
bash
terminal
# Server address (if not on localhost:9867)
export PINCHTAB_URL=http://localhost:9867
# Server port (alternative to PINCHTAB_URL)
export BRIDGE_PORT=9868
# Default instance (skip --instance flag)
export PINCHTAB_INSTANCE=inst_abc123
# Auth token
export PINCHTAB_TOKEN=sk_xxx
# Request timeout
export PINCHTAB_TIMEOUT=30
# Output format
export PINCHTAB_FORMAT=json  # json, text (coming soon)
# Disable colors
export PINCHTAB_NO_COLOR=1
Common Patterns
Wait for page load, then interact
bash
terminal
pinchtab --instance inst_abc123 nav https://example.com
sleep 2  # Wait for page
pinchtab --instance inst_abc123 snap -i
Click, wait, screenshot
bash
terminal
pinchtab --instance inst_abc123 click e5
sleep 1
pinchtab --instance inst_abc123 ss -o result.png
Form fill
bash
terminal
pinchtab --instance inst_abc123 fill e1 "John Doe"
pinchtab --instance inst_abc123 fill e2 "john@example.com"
pinchtab --instance inst_abc123 click e3  # Submit button
sleep 2
pinchtab --instance inst_abc123 snap
Search and verify
bash
terminal
pinchtab --instance inst_abc123 nav https://google.com
pinchtab --instance inst_abc123 fill e1 "golang"
pinchtab --instance inst_abc123 press Enter
sleep 2
pinchtab --instance inst_abc123 text | grep -q "golang"
echo "Search results found"
Exit Codes
bash
terminal
pinchtab instance inst_abc123 logs
echo $?  # 0 = success
pinchtab --instance nonexistent snap
echo $?  # 4 = not found
pinchtab instance launch --invalid-flag
echo $?  # 1 = user error
curl http://localhost:9867/health > /dev/null || {
  echo "Server down"  # 2 = server error
}