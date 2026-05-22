const { app, BrowserWindow, screen, dialog, ipcMain } = require('electron');
const path = require('path');
const IpcHandlers   = require('./src/ipc/handlers');
const Logger        = require('./src/logger');
const WindowState   = require('./src/window-state');
// autoUpdater는 app.isPackaged 환경에서만 lazy-require (6.8.x 이상: require 시점에 app.getVersion() 호출)
let autoUpdater = null;

let mainWindow        = null;
let log               = null;
let winState          = null;
// 렌더러가 리스너를 등록하기 전에 발생한 업데이트 이벤트를 캐싱
let _lastUpdateStatus = null;

function _sendUpdateStatus(data) {
  _lastUpdateStatus = data;
  mainWindow?.webContents.send('update-status', data);
}

function createWindow () {
  const savedOpts = winState?.isOnScreen(screen) ? winState.getBrowserWindowOptions() : {};

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    ...savedOpts,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (winState?._state?.maximized) mainWindow.maximize();

  mainWindow.on('close', () => {
    try { winState?.save(mainWindow); } catch (_) {}
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
  if (!autoUpdater) return;
  log.info('사용자 요청으로 업데이트 설치 시작');
  autoUpdater.quitAndInstall();
});

// 렌더러가 리스너 등록 후 캐싱된 상태를 요청
ipcMain.handle('updater:getLastStatus', () => _lastUpdateStatus);

// 수동 업데이트 체크 — Promise로 결과 직접 반환 (IPC 이벤트 경쟁 조건 없음)
ipcMain.handle('updater:checkNow', () => {
  if (!app.isPackaged) {
    return { type: 'not-available', version: app.getVersion() };
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      autoUpdater.removeListener('update-not-available', onNotAvail);
      autoUpdater.removeListener('update-available',     onAvail);
      autoUpdater.removeListener('error',                onError);
      resolve(result);
    };
    const onNotAvail = (info) => finish({ type: 'not-available', version: info.version });
    const onAvail    = (info) => finish({ type: 'available',     version: info.version });
    const onError    = (err)  => finish({ type: 'error', message: err.message });
    // 15초 타임아웃
    const timer = setTimeout(() => finish({ type: 'error', message: '업데이트 서버 응답 없음 (시간 초과)' }), 15000);
    autoUpdater.once('update-not-available', onNotAvail);
    autoUpdater.once('update-available',     onAvail);
    autoUpdater.once('error',                onError);
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('수동 업데이트 체크 오류:', err);
      finish({ type: 'error', message: err.message });
    });
  });
});

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

  winState = new WindowState(app.getPath('userData'));
  log.info(`창 상태 복원: ${JSON.stringify(winState._state)}`);

  const ipcHandlers = new IpcHandlers(__dirname, app.getPath('userData'), log);
  ipcHandlers.register();

  createWindow();

  if (app.isPackaged) {
    // 패키지 환경에서만 autoUpdater 초기화 (lazy-require)
    const { autoUpdater: _au } = require('electron-updater');
    autoUpdater = _au;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
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
