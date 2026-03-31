const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dualScreen', {
  sendSync: (data) => ipcRenderer.send('url-sync', data),
  onSync: (callback) => ipcRenderer.on('url-sync', (event, data) => callback(data))
});
