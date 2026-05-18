const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const IpcHandlers = require('./src/ipc/handlers');
const { autoUpdater } = require('electron-updater');

// 개발 중에는 업데이트 체크 비활성화
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;

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
  // 업데이트 있을 때 → 자동 다운로드 시작
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', {
      type: 'available',
      version: info.version
    });
  });

  // 최신 버전 사용 중
  autoUpdater.on('update-not-available', () => {
    // 조용히 무시
  });

  // 다운로드 진행률
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-status', {
      type: 'progress',
      percent: Math.round(progress.percent)
    });
  });

  // 다운로드 완료 → 재시작 유도
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-status', {
      type: 'downloaded',
      version: info.version
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err.message);
  });
}

// 렌더러에서 "지금 재시작" 버튼 누를 때
ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  const ipcHandlers = new IpcHandlers(__dirname);
  ipcHandlers.register();

  createWindow();

  // 패키징된 앱에서만 업데이트 체크
  if (app.isPackaged) {
    setupAutoUpdater();
    // 앱 시작 3초 후 체크 (화면 로드 완료 후)
    setTimeout(() => autoUpdater.checkForUpdates(), 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
