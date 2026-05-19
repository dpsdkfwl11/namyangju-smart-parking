const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy
  readDataFiles: () => ipcRenderer.invoke('read-data-files'),
  readExcelFile: (fileName) => ipcRenderer.invoke('read-excel-file', fileName),
  
  // Auth
  auth: {
    verifyPassword: (password) => ipcRenderer.invoke('auth:verify', password)
  },
  
  // CCTV CRUD
  cctv: {
    getAll: () => ipcRenderer.invoke('cctv:getAll'),
    add: (data) => ipcRenderer.invoke('cctv:add', data),
    update: (id, data) => ipcRenderer.invoke('cctv:update', id, data),
    delete: (id) => ipcRenderer.invoke('cctv:delete', id)
  },
  
  // Data Export/Import & Misc
  db: {
    migrateFromJson: () => ipcRenderer.invoke('db:migrateFromJson')
  },
  
  // Zones
  zones: {
    getBusLanes: () => ipcRenderer.invoke('zones:getBusLanes'),
    getFlexibleZones: () => ipcRenderer.invoke('zones:getFlexibleZones')
  },
  
  // Stats
  stats: {
    getCCTVStats: () => ipcRenderer.invoke('stats:getCCTVStats'),
    getTimeSeries: (days) => ipcRenderer.invoke('stats:getTimeSeries', days)
  },

  // 데이터 관리 (Excel import / 통계)
  data: {
    scanExcelFiles:      ()         => ipcRenderer.invoke('data:scanExcelFiles'),
    importExcel:         (fileName) => ipcRenderer.invoke('data:importExcel', fileName),
    addExcelFiles:       ()         => ipcRenderer.invoke('data:addExcelFiles'),
    getEnforcementStats: (params)    => ipcRenderer.invoke('data:getEnforcementStats', params),
    exportCCTV:          ()         => ipcRenderer.invoke('data:exportCCTV'),
    exportEnforcement:   ()         => ipcRenderer.invoke('data:exportEnforcement')
  },

  // 설정
  settings: {
    changePassword:   (data) => ipcRenderer.invoke('auth:changePassword', data),
    resetCCTV:        ()     => ipcRenderer.invoke('db:resetCCTV'),
    resetEnforcement: ()     => ipcRenderer.invoke('db:resetEnforcement'),
    getAppInfo:       ()     => ipcRenderer.invoke('system:getAppInfo'),
    openDbFolder:     ()     => ipcRenderer.invoke('system:openDbFolder'),
    openLogFolder:    ()     => ipcRenderer.invoke('system:openLogFolder'),
    captureMap:       (rect) => ipcRenderer.invoke('system:captureMap', rect)
  },

  // 리포트
  report: {
    exportPDF: () => ipcRenderer.invoke('report:exportPDF')
  },

  // 자동 업데이트
  updater: {
    onStatus:      (callback) => ipcRenderer.on('update-status', (_e, data) => callback(data)),
    getLastStatus: ()         => ipcRenderer.invoke('updater:getLastStatus'),
    install:       ()         => ipcRenderer.invoke('updater:install'),
    checkNow:      ()         => ipcRenderer.invoke('updater:checkNow')
  }
});
