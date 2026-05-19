const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const IpcHandlers = require('./src/ipc/handlers');
const Logger      = require('./src/logger');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let log        = null;
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
    log.info(`업데이트 발견: v${info.version}`);
    _sendUpdateStatus({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info(`최신 버전 사용 중: v${info.version}`);
  });

  autoUpdater.on('download-progress', (progress) => {
    _sendUpdateStatus({ type: 'progress', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`업데이트 다운로드 완료: v${info.version}`);
    _sendUpdateStatus({ type: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    log.error('AutoUpdater 오류:', err);
  });
}

// 렌더러에서 "지금 재시작" 버튼 누를 때
ipcMain.handle('updater:install', () => {
  log.info('사용자 요청으로 업데이트 설치 시작');
  autoUpdater.quitAndInstall();
});

// 렌더러가 리스너 등록 후 캐싱된 상태를 요청
ipcMain.handle('updater:getLastStatus', () => _lastUpdateStatus);

// 로그 폴더 열기
ipcMain.handle('system:openLogFolder', () => {
  const { shell } = require('electron');
  shell.openPath(path.join(app.getPath('userData'), 'logs'));
});

app.whenReady().then(() => {
  // 로거 초기화 (IpcHandlers보다 먼저)
  const logDir = path.join(app.getPath('userData'), 'logs');
  log = new Logger(logDir);

  // 앱 시작 정보 기록
  log.info('='.repeat(60));
  log.info(`앱 시작 v${app.getVersion()}`);
  log.info(`userData: ${app.getPath('userData')}`);
  log.info(`플랫폼: ${process.platform} ${process.arch} / Electron ${process.versions.electron} / Node ${process.versions.node}`);

  // 프로세스 전역 오류 캐치
  process.on('uncaughtException', (err) => {
    log.error('uncaughtException:', err);
  });
  process.on('unhandledRejection', (reason) => {
    log.error('unhandledRejection:', reason instanceof Error ? reason : String(reason));
  });

  const ipcHandlers = new IpcHandlers(__dirname, app.getPath('userData'), log);
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
  log?.info('앱 종료');
  if (process.platform !== 'darwin') app.quit();
});
