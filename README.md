# Dual Screen HTML — Synchronized Canvas Across Two Monitors

An Electron app that opens a fullscreen window on each connected monitor and keeps them in sync. Drag and scroll on one screen and the canvas moves on the other, creating a seamless multi-monitor workspace.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)

## How It Works

1. **`main.js`** (Electron main process) detects every connected display using `screen.getAllDisplays()`, opens a frameless fullscreen `BrowserWindow` on each one, and tells each window its monitor index and dimensions via IPC.
2. **`index.html`** renders a large pannable/zoomable canvas with colored blocks. When the user drags or scrolls, the renderer sends its transform state (`tx`, `ty`, `tz`) to the main process.
3. The main process relays that state to all other windows, so every screen shows the same view offset by its monitor position.

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

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('init', {
        monitorIndex: index,
        monitorWidth: width,
        monitorHeight: height
      });
    });

    windows.push(win);
  });

  // Relay sync messages between windows
  ipcMain.on('sync', (event, data) => {
    windows.forEach(win => {
      if (win.webContents !== event.sender) {
        win.webContents.send('sync', data);
      }
    });
  });
});
```

**What's happening:**
- `screen.getAllDisplays()` returns an array of monitor objects with position and size.
- Each `BrowserWindow` is placed at the exact `x, y` of its display and set to fullscreen.
- `frame: false` removes the title bar for a clean look.
- `nodeIntegration: true` lets the renderer `require('electron')` for IPC.
- When any window sends a `'sync'` event, the main process forwards it to all *other* windows.

#### 5. Create the renderer — `index.html`

This is the page loaded in each window. It draws a large world of blocks and handles mouse pan + scroll zoom.

Create `index.html` with:
- A CSS-styled dark canvas with a dot-grid background
- Colored blocks positioned across an 8000px-wide world (so content spans both monitors)
- Mouse event listeners for panning (click-drag) and zooming (scroll wheel)
- Electron IPC code wrapped in a `try/catch` so the file also works in a regular browser (without sync)

The IPC sync logic:
```js
// Each window offsets its view by (monitorIndex * monitorWidth)
// When sending: add the offset so coordinates are in "world space"
// When receiving: subtract the offset to convert back to "local space"
ipcRenderer.send('sync', {
  tx: tx + (monitorIndex * monitorWidth),
  ty: ty,
  tz: tz
});

ipcRenderer.on('sync', (event, data) => {
  tx = data.tx - (monitorIndex * monitorWidth);
  ty = data.ty;
  tz = data.tz;
});
```

See the full `index.html` in this repo for the complete code.

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
