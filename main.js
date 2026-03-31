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

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif'];
const PDF_EXTENSIONS = ['.pdf'];

function isVideoFile(filePath) {
  return VIDEO_EXTENSIONS.some(ext => filePath.toLowerCase().endsWith(ext));
}
function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.some(ext => filePath.toLowerCase().endsWith(ext));
}
function isPdfFile(filePath) {
  return PDF_EXTENSIONS.some(ext => filePath.toLowerCase().endsWith(ext));
}
function isUrl(str) {
  return str.startsWith('http://') || str.startsWith('https://');
}

function launchVideoOnAllDisplays(filePath) {
  windows.forEach(w => w.close());
  windows = [];

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

    win.loadFile('video-player.html');
    win.setFullScreen(true);

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('video-init', {
        filePath: filePath,
        monitorIndex: index,
        totalMonitors: displays.length
      });
    });

    windows.push(win);
  });
}

function launchImageOnAllDisplays(filePath) {
  windows.forEach(w => w.close());
  windows = [];

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

    win.loadFile('image-viewer.html');
    win.setFullScreen(true);

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('image-init', {
        filePath: filePath,
        monitorIndex: index,
        totalMonitors: displays.length
      });
    });

    windows.push(win);
  });
}

function launchPdfOnAllDisplays(filePath) {
  windows.forEach(w => w.close());
  windows = [];

  const displays = screen.getAllDisplays();
  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');

  displays.forEach((display, index) => {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x, y, width, height,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true
      }
    });

    win.loadURL(fileUrl);
    win.setFullScreen(true);

    win.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape') {
        windows.forEach(w => w.close());
        windows = [];
        app.quit();
      }
    });

    windows.push(win);
  });
}

function launchUrlOnAllDisplays(url) {
  windows.forEach(w => w.close());
  windows = [];

  const displays = screen.getAllDisplays();
  const preloadPath = path.join(__dirname, 'url-preload.js');

  displays.forEach((display, index) => {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x, y, width, height,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: preloadPath
      }
    });

    win.loadURL(url);
    win.setFullScreen(true);

    win.webContents.on('did-finish-load', () => {
      win.webContents.executeJavaScript(`
        (function() {
          const monitorIndex = ${index};
          const screenW = ${width};
          let isSyncing = false;

          // Scroll this monitor to its horizontal slice
          setTimeout(() => {
            window.scrollTo({ left: monitorIndex * screenW, top: 0, behavior: 'instant' });
          }, 500);

          // Sync scroll to other monitors
          window.addEventListener('scroll', () => {
            if (isSyncing) return;
            if (window.dualScreen) {
              window.dualScreen.sendSync({
                scrollX: window.scrollX + monitorIndex * screenW,
                scrollY: window.scrollY
              });
            }
          }, { passive: true });

          // Receive sync from other monitors
          if (window.dualScreen) {
            window.dualScreen.onSync((data) => {
              if (data.action === 'close') { window.close(); return; }
              isSyncing = true;
              window.scrollTo({
                left: data.scrollX - monitorIndex * screenW,
                top: data.scrollY,
                behavior: 'instant'
              });
              setTimeout(() => { isSyncing = false; }, 50);
            });
          }

          // Escape to close all
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && window.dualScreen) {
              window.dualScreen.sendSync({ action: 'close' });
            }
          });
        })();
      `);
    });

    windows.push(win);
  });
}

function launchOnAllDisplays(filePath) {
  // Close any existing windows
  windows.forEach(w => w.close());
  windows = [];

  if (isVideoFile(filePath)) {
    launchVideoOnAllDisplays(filePath);
    return;
  }
  if (isImageFile(filePath)) {
    launchImageOnAllDisplays(filePath);
    return;
  }
  if (isPdfFile(filePath)) {
    launchPdfOnAllDisplays(filePath);
    return;
  }

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

            if (monitorIndex > 0) {
              tx -= monitorWidth * monitorIndex;
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
  if (fileArg && isUrl(fileArg)) {
    launchUrlOnAllDisplays(fileArg);
    return;
  }
  if (fileArg && (fileArg.endsWith('.html') || fileArg.endsWith('.htm') || isVideoFile(fileArg) || isImageFile(fileArg) || isPdfFile(fileArg))) {
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
      title: 'Choose a file',
      filters: [
        { name: 'All Supported', extensions: ['html', 'htm', 'mp4', 'mkv', 'webm', 'avi', 'mov', 'm4v', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'pdf'] },
        { name: 'HTML Files', extensions: ['html', 'htm'] },
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov', 'm4v'] },
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif'] },
        { name: 'PDF Files', extensions: ['pdf'] },
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

  ipcMain.on('open-url', (event, url) => {
    pickerWin.close();
    launchUrlOnAllDisplays(url);
  });

  // Relay sync messages between display windows (HTML pan/zoom, image pan/zoom)
  ipcMain.on('sync', (event, data) => {
    if (data.action === 'close') {
      windows.forEach(w => w.close());
      windows = [];
      app.quit();
      return;
    }
    windows.forEach(win => {
      if (win.webContents !== event.sender) {
        win.webContents.send('sync', data);
      }
    });
  });

  // Relay URL scroll sync messages
  ipcMain.on('url-sync', (event, data) => {
    if (data.action === 'close') {
      windows.forEach(w => w.close());
      windows = [];
      app.quit();
      return;
    }
    windows.forEach(win => {
      if (win.webContents !== event.sender) {
        win.webContents.send('url-sync', data);
      }
    });
  });

  // Relay video sync messages
  ipcMain.on('video-sync', (event, data) => {
    if (data.action === 'close') {
      windows.forEach(w => w.close());
      windows = [];
      app.quit();
      return;
    }
    windows.forEach(win => {
      if (win.webContents !== event.sender) {
        win.webContents.send('video-sync', data);
      }
    });
  });
});
