const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const IpcHandlers = require('./src/ipc/handlers');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
// 렌더러가 리스너를 등록하기 전에 발생한 업데이트 이벤트를 캐싱
let _lastUpdateStatus = null;

function _sendUpdateStatus(data) {
  _lastUpdateStatus = data;
  mainWindow?.webContents.send('update-status', data);
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    _sendUpdateStatus({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {});

  autoUpdater.on('download-progress', (progress) => {
    _sendUpdateStatus({ type: 'progress', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    _sendUpdateStatus({ type: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err.message);
  });
}

// 렌더러에서 "지금 재시작" 버튼 누를 때
ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall();
});

// 렌더러가 리스너 등록 후 캐싱된 상태를 요청
ipcMain.handle('updater:getLastStatus', () => _lastUpdateStatus);

app.whenReady().then(() => {
  const ipcHandlers = new IpcHandlers(__dirname, app.getPath('userData'));
  ipcHandlers.register();

  createWindow();

  if (app.isPackaged) {
    setupAutoUpdater();
    // 페이지 로드 완료 후 2초 뒤 업데이트 체크 (렌더러 리스너 등록 보장)
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => autoUpdater.checkForUpdates(), 2000);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
