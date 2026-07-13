// electron/main.js
// Main process: opens the built dist/monarchy.html in a plain native
// window. No default Electron menu bar (File/Edit/View/...), no browser
// chrome — this should feel like a real desktop app, not a browser
// wrapper around a webpage.

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Remove Electron's default application menu (File/Edit/View/Window/Help).
Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#c2ac7a', // matches the light table background — avoids a white flash on load
    autoHideMenuBar: true,      // extra safety net on platforms where a menu bar can reappear
    webPreferences: {
      nodeIntegration: false,   // the app is plain browser JS/HTML/CSS — no Node API surface needed
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'monarchy.html'));

  // Uncomment while debugging a packaged build:
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
