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

    // Tell each window which monitor it is
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('init', {
        monitorIndex: index,
        monitorWidth: width,
        monitorHeight: height
      });
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