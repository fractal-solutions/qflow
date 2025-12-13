// To run this example, you may need to install system dependencies for webview-bun.
//
// --- Linux ---
// The compiled linux library in this package requires GTK 4 and WebkitGTK 6.0.
// Please install the required packages for your distribution:
//
// Debian-based: sudo apt install libgtk-4-1 libwebkitgtk-6.0-4
// Arch-based:   sudo pacman -S gtk4 webkitgtk-6.0
// Fedora-based: sudo dnf install gtk4 webkitgtk6.0
//
// --- Windows ---
// The Microsoft Edge WebView2 runtime is required. It is usually pre-installed on
// Windows 11. For other versions, you can download it from:
// https://developer.microsoft.com/en-us/microsoft-edge/webview2/
//
// --- macOS ---
// No special installation is required for running on macOS.

import { AsyncFlow } from '../src/qflow.js';
import { WebviewNode } from '../src/nodes/webview.js';

const html = `
<html>
    <body>
        <h1>Hello from qflow!</h1>
        <p>This is a webview window created from a qflow node.</p>
    </body>
</html>
`;

const webviewNode = new WebviewNode();
webviewNode.setParams({
  html,
  title: 'Qflow Webview Test',
  width: 400,
  height: 200,
});

const flow = new AsyncFlow(webviewNode);

await flow.runAsync();