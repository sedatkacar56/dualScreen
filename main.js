const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let windows = [];

// Auto-update: check for updates on launch
autoUpdater.autoDownload = false;
app.on('ready', () => {
  autoUpdater.checkForUpdates().catch(() => {});
});
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `DualScreen v${info.version} is available. Download now?`,
    buttons: ['Download', 'Later']
  }).then(result => {
    if (result.response === 0) autoUpdater.downloadUpdate();
  });
});
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The app will restart to install it.',
    buttons: ['Restart Now', 'Later']
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

function launchOnAllDisplays(filePath) {
  // Close any existing windows
  windows.forEach(w => w.close());
  windows = [];

  const displays = screen.getAllDisplays();
  const isHTML = filePath.endsWith('.html') || filePath.endsWith('.htm');

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

    win.loadFile(filePath);
    win.setFullScreen(true);

    win.webContents.on('did-finish-load', () => {
      if (isHTML) {
        // Try to inject sync — only works if the page has tx, ty, tz, applyStage
        win.webContents.executeJavaScript(`
          (function() {
            if (typeof tx === 'undefined' || typeof applyStage !== 'function') {
              console.log('No sync variables found — display-only mode');
              return;
            }
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
      }
    });

    windows.push(win);
  });
}

app.whenReady().then(() => {
  // Check if a file was passed as argument (drag & drop onto .exe)
  const fileArg = process.argv.find((arg, i) => i > 0 && !arg.startsWith('-'));
  if (fileArg && (fileArg.endsWith('.html') || fileArg.endsWith('.htm'))) {
    launchOnAllDisplays(path.resolve(fileArg));
    return;
  }

  // Check if page.html exists next to the app
  const defaultPage = path.join(__dirname, 'page.html');
  const fs = require('fs');
  if (fs.existsSync(defaultPage)) {
    launchOnAllDisplays(defaultPage);
    return;
  }

  // Show file picker
  const pickerWin = new BrowserWindow({
    width: 520,
    height: 400,
    frame: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  pickerWin.loadFile('picker.html');

  ipcMain.on('open-file-dialog', async (event) => {
    const result = await dialog.showOpenDialog(pickerWin, {
      title: 'Choose an HTML file',
      filters: [
        { name: 'HTML Files', extensions: ['html', 'htm'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      event.sender.send('file-chosen', result.filePaths[0]);
      setTimeout(() => {
        pickerWin.close();
        launchOnAllDisplays(result.filePaths[0]);
      }, 500);
    }
  });

  ipcMain.once('use-default', () => {
    pickerWin.close();
    launchOnAllDisplays(path.join(__dirname, 'index.html'));
  });

  // Relay sync messages between display windows
  ipcMain.on('sync', (event, data) => {
    windows.forEach(win => {
      if (win.webContents !== event.sender) {
        win.webContents.send('sync', data);
      }
    });
  });
});
