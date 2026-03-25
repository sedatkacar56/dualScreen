# Dual Screen — View Any HTML Across Two Monitors

An Electron app that displays any HTML file across all your connected monitors with synchronized pan and zoom. Just pick a file and it goes fullscreen on every screen.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)

## Features

- **File picker** — launch the app and browse for any HTML file
- **Auto-sync** — if your HTML has pan/zoom (`tx`, `ty`, `tz` + `applyStage()`), both screens sync automatically
- **Display mode** — HTML without pan/zoom just shows fullscreen on all monitors
- **Drag & drop** — drag an HTML file onto the `.exe` to open it directly
- **page.html shortcut** — place a file called `page.html` next to the app and it loads automatically
- **One-click start** — double-click `start.bat` (no terminal needed)

## Quick Start (Download & Run)

### Option A: Download the `.exe` (easiest)

1. Go to [Releases](https://github.com/sedatkacar56/dualScreen/releases)
2. Download `DualScreen.exe`
3. Double-click it — a file picker opens, choose your HTML file
4. Done — fullscreen on every monitor

### Option B: Clone and run

```bash
git clone https://github.com/sedatkacar56/dualScreen.git
cd dualScreen
npm install
npm start
```

Or just double-click `start.bat` on Windows.

## How to Load Your Own HTML

Three ways:

1. **File picker** — run the app, click "Browse HTML File", select your file
2. **page.html** — place your HTML file next to the app and rename it to `page.html`. The app loads it automatically on launch
3. **Drag & drop** — drag your `.html` file onto `DualScreen.exe`

## Making Your HTML Sync Across Monitors

If you want pan/zoom to stay synced between screens, your HTML needs these globals:

```js
let tx = 0, ty = 0, tz = 1;

function applyStage() {
  // apply your transform, e.g.:
  stage.style.transform = `translate(${tx}px,${ty}px) scale(${tz})`;
}
```

The app detects these automatically and injects the sync code at runtime. Your HTML file is never modified.

If your HTML doesn't have these variables, it simply displays fullscreen on each monitor — no sync, no errors.

## Build It From Scratch

### Prerequisites

- **Node.js** (v18+) — [https://nodejs.org](https://nodejs.org)
- **Two monitors** connected to your machine

### Steps

#### 1. Create the project

```bash
mkdir dual-screen-html
cd dual-screen-html
npm init -y
```

Edit `package.json`:

```json
{
  "name": "dual-screen-app",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --win"
  },
  "dependencies": {
    "electron": "^41.0.4"
  },
  "devDependencies": {
    "electron-builder": "^25.1.8"
  }
}
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Create `main.js`

This is the brain of the app. It:
- Detects all connected monitors
- Opens a fullscreen window on each one
- Shows a file picker if no default file is found
- Auto-injects pan/zoom sync into HTML pages that support it

See the full `main.js` in this repo.

#### 4. Create `picker.html`

A simple UI with two buttons — "Browse HTML File" and "Use Demo". See `picker.html` in this repo.

#### 5. Create your `index.html`

The demo page. A dark canvas with colored blocks spanning 8000px wide. Add your own blocks, change colors, or build something completely different.

The only requirement for sync: global `tx`, `ty`, `tz` variables and an `applyStage()` function.

#### 6. Run

```bash
npm start
```

### Build the `.exe`

```bash
npm run build
```

The portable `.exe` appears in the `dist/` folder.

### How to exit

Press `Alt+F4` (Windows/Linux) or `Cmd+Q` (macOS).

## License

MIT
