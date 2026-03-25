const { app, BrowserWindow, screen, ipcMain } = require('electron');

let windows = [];

app.whenReady().then(() => {
  const displays = screen.getAllDisplays();

  displays.forEach((display, index) => {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x: x,
      y: y,
      width: width,
      height: height,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    win.loadFile('index.html');
    win.setFullScreen(true);

    // Auto-inject IPC sync code into any HTML page
    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(`
        (function() {
          const { ipcRenderer } = require('electron');
          const monitorIndex = ${index};
          const monitorWidth = ${width};
          let isSyncing = false;

          if (monitorIndex === 1) {
            tx -= monitorWidth;
            applyStage();
          }

          ipcRenderer.on('sync', (event, data) => {
            isSyncing = true;
            tx = data.tx - (monitorIndex * monitorWidth);
            ty = data.ty;
            tz = data.tz;
            applyStage();
            isSyncing = false;
          });

          const _applyStage = applyStage;
          applyStage = function() {
            _applyStage();
            if (!isSyncing) {
              ipcRenderer.send('sync', {
                tx: tx + (monitorIndex * monitorWidth),
                ty: ty,
                tz: tz
              });
            }
          };
        })();
      `);
    });

    windows.push(win);
  });

  // Relay drag/scroll from one window to the other
  ipcMain.on('sync', (event, data) => {
    windows.forEach(win => {
      if (win.webContents !== event.sender) {
        win.webContents.send('sync', data);
      }
    });
  });
});