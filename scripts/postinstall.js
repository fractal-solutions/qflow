import os from 'os';

const platform = os.platform();

const messages = {
  linux: `
---------------------------------------------------------------------
[Qflow] Optional dependency for WebviewNode:
To use the WebviewNode, you need to install system dependencies.
The compiled linux library in this package requires GTK 4 and WebkitGTK 6.0.

Please install the required packages for your distribution:

Debian-based: sudo apt install libgtk-4-1 libwebkitgtk-6.0-4
Arch-based:   sudo pacman -S gtk4 webkitgtk-6.0
Fedora-based: sudo dnf install gtk4 webkitgtk6.0

For development and building from source, you may also need:
Debian-based: sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev cmake ninja-build clang
Fedora-based: sudo dnf install gtk4-devel webkitgtk6.0-devel cmake ninja-build clang
Arch-based:   sudo pacman -S cmake ninja clang
---------------------------------------------------------------------
`,
  win32: `
---------------------------------------------------------------------
[Qflow] Optional dependency for WebviewNode:
To use the WebviewNode, the Microsoft Edge WebView2 runtime is required.
It is usually pre-installed on Windows 11. For other versions, you can
download it from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

For development and building from source, you will need the C++ Build Tools:
1. Go to https://visualstudio.microsoft.com/downloads
2. Scroll to "Tools for Visual Studio" and download "Build Tools for Visual Studio".
3. Select "Desktop development with C++" and install.
---------------------------------------------------------------------
`,
  darwin: `
---------------------------------------------------------------------
[Qflow] Optional dependency for WebviewNode:
No special installation is required for running on macOS.

For development and building from source, you will need:
brew install cmake ninja clang
---------------------------------------------------------------------
`
};

if (messages[platform]) {
  console.log(messages[platform]);
}