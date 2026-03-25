# Dual Screen HTML — Synchronized Canvas Across Two Monitors

An Electron app that opens a fullscreen window on each connected monitor and keeps them in sync. Drag and scroll on one screen and the canvas moves on the other, creating a seamless multi-monitor workspace.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)

## How It Works

1. **`main.js`** detects every connected display, opens a fullscreen frameless window on each one, and **automatically injects** the IPC sync code into any HTML page after it loads — via `executeJavaScript`.
2. **`index.html`** (or any HTML you create) just needs global `tx`, `ty`, `tz` variables and an `applyStage()` function. No IPC code needed in the HTML — `main.js` handles it all.
3. When the user pans or zooms, the injected sync code broadcasts the transform state to all other windows so every screen stays in sync, offset by its monitor position.

## Build It From Scratch

### Prerequisites

- **Node.js** (v18 or later) — [https://nodejs.org](https://nodejs.org)
- **Two monitors** connected to your machine (works with one monitor too, but the sync effect won't be visible)

### Steps

#### 1. Create the project folder

```bash
mkdir dual-screen-html
cd dual-screen-html
```

#### 2. Initialize the project

```bash
npm init -y
```

This creates `package.json`. Open it and make sure it looks like this:

```json
{
  "name": "dual-screen-app",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  }
}
```

The key parts: `"main"` points to `main.js` (Electron's entry point) and the `"start"` script runs Electron.

#### 3. Install Electron

```bash
npm install electron
```

#### 4. Create the main process — `main.js`

This file runs in Node.js. It detects monitors, opens a window on each, and relays pan/zoom messages between them.

```js
const { app, BrowserWindow, screen, ipcMain } = require('electron');

let windows = [];

app.whenReady().then(() => {
  const displays = screen.getAllDisplays();

  displays.forEach((display, index) => {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x, y, width, height,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    win.loadFile('index.html');
    win.setFullScreen(true);

    // Auto-inject IPC sync into any HTML — no need to add it manually
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(`
        (function() {
          const { ipcRenderer } = require('electron');
          const monitorIndex = ${index};
          const monitorWidth = ${width};
          let isSyncing = false;

          if (monitorIndex === 1) { tx -= monitorWidth; applyStage(); }

          ipcRenderer.on('sync', (event, data) => {
            isSyncing = true;
            tx = data.tx - (monitorIndex * monitorWidth);
            ty = data.ty; tz = data.tz;
            applyStage();
            isSyncing = false;
          });

          const _applyStage = applyStage;
          applyStage = function() {
            _applyStage();
            if (!isSyncing) {
              ipcRenderer.send('sync', {
                tx: tx + (monitorIndex * monitorWidth), ty, tz
              });
            }
          };
        })();
      `);
    });

    windows.push(win);
  });

  ipcMain.on('sync', (event, data) => {
    windows.forEach(win => {
      if (win.webContents !== event.sender) win.webContents.send('sync', data);
    });
  });
});
```

**What's happening:**
- `screen.getAllDisplays()` returns every connected monitor with its position and size.
- Each `BrowserWindow` is placed at the exact `x, y` of its display and set to fullscreen.
- `frame: false` removes the title bar for a clean look.
- `executeJavaScript` auto-injects the sync logic after the page loads — your HTML stays untouched.
- `ipcMain` relays pan/zoom state from one window to all others.

#### 5. Create the renderer — `index.html`

This is the page loaded in each window. It draws a large world of blocks and handles mouse pan + scroll zoom.

Your HTML only needs three things — **no IPC code required**, `main.js` injects it automatically:

```js
let tx = 0, ty = 0, tz = 1;  // pan/zoom state (global)

function applyStage() {
  stage.style.transform = `translate(${tx}px,${ty}px) scale(${tz})`;
}
```

That's it. Add your own layout, blocks, or design freely. See `index.html` in this repo for a full working example.

#### 6. Run it

```bash
npm start
```

A fullscreen window opens on each connected monitor. Click and drag to pan — both screens move together.

### How to exit

Press `Alt+F4` (Windows/Linux) or `Cmd+Q` (macOS) to close.

## Customization Ideas

- **Add your own blocks** — edit the `<div class="block">` elements in `index.html`. Change positions, sizes, colors, and text.
- **Connect blocks with lines** — use an SVG or canvas overlay to draw edges between nodes.
- **Dynamic content** — load block data from a JSON file instead of hardcoding HTML.

## License

MIT
