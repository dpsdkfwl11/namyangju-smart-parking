const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const DatabaseManager = require('../db/database');

class IpcHandlers {
  constructor(appPath) {
    this.appPath = appPath;
    this.dbManager = new DatabaseManager(appPath);
    this.db = this.dbManager.getDb();
    
    // 기본 비밀번호 초기화 (1234 해시)
    try {
      const stmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?');
      const row = stmt.get('admin_password');
      if (!row) {
        const hash = bcrypt.hashSync('1234', 10);
        this.db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?)').run('admin_password', hash);
      }
    } catch(e) { console.error('Init password error:', e); }

    // CCTV JSON 자동 마이그레이션 (DB 비어있을 때만 실행)
    try {
      const count = this.db.prepare('SELECT COUNT(*) as cnt FROM cctv').get().cnt;
      if (count === 0) {
        const filePath = path.join(this.appPath, 'data', 'cctv.json');
        if (fs.existsSync(filePath)) {
          const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const items = jsonData.data || jsonData;
          const ins = this.db.prepare(
            `INSERT INTO cctv (cctv_name, install_address, latitude, longitude, install_date, management_number, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          );
          const tx = this.db.transaction((rows) => {
            for (const item of rows) {
              ins.run(
                item['CCTV명'] || '',
                item['설치주소'] || '',
                parseFloat(item['위도']) || 0,
                parseFloat(item['경도']) || 0,
                item['설치일자'] || '',
                item['관리번호'] || '',
                item['상태'] || '운영중'
              );
            }
          });
          tx(items);
          console.log(`[Auto-migrate] CCTV ${items.length}건 DB 초기화 완료`);
        }
      }
    } catch(e) { console.error('Auto-migrate CCTV error:', e); }
  }

  register() {
    // 1. Data loading (Legacy fallback)
    ipcMain.handle('read-data-files', async () => {
      const dataDir = path.join(this.appPath, 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const files = fs.readdirSync(dataDir);
      const result = { cctv: null, busLane: null, flexibleZone: null, excelFiles: [] };
      for (const file of files) {
        const filePath = path.join(dataDir, file);
        if (file === 'cctv.json') result.cctv = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        else if (file === 'bus_lane.geojson') result.busLane = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        else if (file === 'flexible_zone.geojson') result.flexibleZone = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        else if (file.endsWith('.xlsx') || file.endsWith('.csv')) result.excelFiles.push(file);
      }
      return result;
    });

    ipcMain.handle('read-excel-file', async (event, fileName) => {
      const filePath = path.join(this.appPath, 'data', fileName);
      return fs.readFileSync(filePath);
    });

    // 2. Auth handlers
    ipcMain.handle('auth:verify', async (event, password) => {
      try {
        const stmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?');
        const row = stmt.get('admin_password');
        if (row && bcrypt.compareSync(password, row.value)) {
          return { success: true, data: { token: 'mock_token_' + Date.now() } };
        }
      } catch (e) { console.error('Auth error', e); }
      return { success: false, message: 'Invalid password' };
    });

    // 3. CCTV CRUD
    ipcMain.handle('cctv:getAll', () => {
      try { return this.db.prepare('SELECT * FROM cctv').all(); }
      catch (e) { return []; }
    });

    ipcMain.handle('cctv:add', (event, data) => {
      try {
        const stmt = this.db.prepare(`INSERT INTO cctv (cctv_name, install_address, latitude, longitude, install_date, management_number, status) 
                                      VALUES (@cctv_name, @install_address, @latitude, @longitude, @install_date, @management_number, @status)`);
        const info = stmt.run(data);
        return { success: true, id: info.lastInsertRowid };
      } catch (e) { return { success: false, error: e.message }; }
    });

    ipcMain.handle('cctv:update', (event, id, data) => {
      try {
        const stmt = this.db.prepare(`UPDATE cctv SET cctv_name=@cctv_name, install_address=@install_address, latitude=@latitude, longitude=@longitude, 
                                      install_date=@install_date, management_number=@management_number, status=@status WHERE id=@id`);
        stmt.run({ ...data, id });
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });

    ipcMain.handle('cctv:delete', (event, id) => {
      try { this.db.prepare('DELETE FROM cctv WHERE id=?').run(id); return { success: true }; }
      catch (e) { return { success: false, error: e.message }; }
    });

    // 4. JSON to DB Migration
    ipcMain.handle('db:migrateFromJson', async () => {
      try {
        const filePath = path.join(this.appPath, 'data', 'cctv.json');
        if (!fs.existsSync(filePath)) return { success: false, message: 'No JSON file found' };
        
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const items = jsonData.data || jsonData;
        
        // 기존 데이터 삭제 (완전 초기화 후 마이그레이션)
        this.db.prepare('DELETE FROM cctv').run();
        
        const insertStmt = this.db.prepare(`INSERT INTO cctv (cctv_name, install_address, latitude, longitude, install_date, management_number, status) 
                                           VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
        const migrateTx = this.db.transaction((itemsToInsert) => {
          for (const item of itemsToInsert) {
            insertStmt.run(item['CCTV명'], item['설치주소'], item['위도'], item['경도'], item['설치일자'], item['관리번호'], item['상태'] || '운영중');
          }
        });
        
        migrateTx(items);
        return { success: true, count: items.length };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    // 5. Stats
    ipcMain.handle('stats:getCCTVStats', () => {
      try {
        const total = this.db.prepare('SELECT COUNT(*) as cnt FROM cctv').get().cnt;
        const active = this.db.prepare("SELECT COUNT(*) as cnt FROM cctv WHERE status = '운영중'").get().cnt;
        return { total, active, inactive: total - active };
      } catch (e) { return { total: 0, active: 0, inactive: 0 }; }
    });

    ipcMain.handle('stats:getTimeSeries', (event, days) => {
      try {
        // SQLite에서는 date 함수를 이용해 날짜를 포맷팅할 수 있습니다.
        // 현재는 더미 데이터를 반환하거나 간단히 설치일자 기준 집계 로직을 넣습니다.
        // 임시로 최근 설치된 갯수를 날짜별로 그룹화하는 로직을 예시로 작성합니다.
        const stmt = this.db.prepare(`
          SELECT substr(install_date, 1, 10) as date, COUNT(*) as count 
          FROM cctv 
          WHERE install_date IS NOT NULL AND install_date != ''
          GROUP BY substr(install_date, 1, 10)
          ORDER BY date DESC
          LIMIT ?
        `);
        return stmt.all(days || 30);
      } catch (e) {
        console.error('getTimeSeries error:', e);
        return [];
      }
    });

    // 6. Zones (GeoJSON)
    ipcMain.handle('zones:getBusLanes', () => {
      try {
        const filePath = path.join(this.appPath, 'data', 'bus_lane.geojson');
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return null;
      } catch (e) {
        console.error('getBusLanes error:', e);
        return null;
      }
    });

    ipcMain.handle('zones:getFlexibleZones', () => {
      try {
        const filePath = path.join(this.appPath, 'data', 'flexible_zone.geojson');
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return null;
      } catch (e) {
        console.error('getFlexibleZones error:', e);
        return null;
      }
    });

    // 7. System handlers
    ipcMain.handle('system:getAppVersion', () => {
      return require(path.join(this.appPath, 'package.json')).version;
    });

    // 8. 데이터 관리: Excel 파일 스캔
    ipcMain.handle('data:scanExcelFiles', () => {
      try {
        const dataDir = path.join(this.appPath, 'data');
        if (!fs.existsSync(dataDir)) return [];
        const files = fs.readdirSync(dataDir)
          .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

        return files.map(fileName => {
          const filePath = path.join(dataDir, fileName);
          const stat = fs.statSync(filePath);
          const row = this.db.prepare(
            'SELECT COUNT(*) as cnt FROM enforcement WHERE source_file = ?'
          ).get(fileName);
          return {
            name: fileName,
            size: stat.size,
            importedCount: row?.cnt || 0
          };
        });
      } catch (e) {
        console.error('data:scanExcelFiles error:', e);
        return [];
      }
    });

    // 9. 데이터 관리: Excel → DB import (트랜잭션, 멱등성 보장)
    ipcMain.handle('data:importExcel', (event, fileName) => {
      try {
        const filePath = path.join(this.appPath, 'data', fileName);
        if (!fs.existsSync(filePath)) {
          return { success: false, error: '파일을 찾을 수 없습니다.' };
        }

        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        if (rawRows.length < 2) {
          return { success: false, error: '데이터 행이 없습니다.' };
        }

        const headers = rawRows[0].map(h => (h ?? '').toString().trim());
        const dataRows = rawRows.slice(1).filter(r => r && r.some(v => v != null));

        const col = name => headers.indexOf(name);
        const iDate   = col('단속일시');
        const iDong   = col('단속동');
        const iPlace  = col('단속장소');
        const iType   = col('단속구분');
        const iViol   = col('위반법규');
        const iZone   = col('단속특별지역');
        const iGpsX   = col('GPS_X');
        const iGpsY   = col('_GPS_Y');

        const stmt = this.db.prepare(`
          INSERT INTO enforcement
            (단속일시, 단속동, 단속장소, 단속구분, 위반법규, 단속특별지역, gps_x, gps_y, source_file)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const importTx = this.db.transaction((rows) => {
          this.db.prepare('DELETE FROM enforcement WHERE source_file = ?').run(fileName);
          for (const row of rows) {
            stmt.run(
              iDate  >= 0 ? (row[iDate]  ?? null) : null,
              iDong  >= 0 ? (row[iDong]  ?? null) : null,
              iPlace >= 0 ? (row[iPlace] ?? null) : null,
              iType  >= 0 ? (row[iType]  ?? null) : null,
              iViol  >= 0 ? (row[iViol]  ?? null) : null,
              iZone  >= 0 ? (row[iZone]  ?? null) : null,
              iGpsX  >= 0 ? (parseFloat(row[iGpsX]) || null) : null,
              iGpsY  >= 0 ? (parseFloat(row[iGpsY]) || null) : null,
              fileName
            );
          }
        });

        importTx(dataRows);
        return { success: true, count: dataRows.length };
      } catch (e) {
        console.error('data:importExcel error:', e);
        return { success: false, error: e.message };
      }
    });

    // 10. 데이터 관리: 단속 통계 집계 (SQL, 전체 데이터 JS 전달 없음)
    ipcMain.handle('data:getEnforcementStats', (event, params) => {
      try {
        const { startDate, endDate, enforcementType } = params || {};

        // 날짜 필터 조건 (substr로 정규화 — 시간 포함 여부 무관)
        const dateParts = [];
        const dateArgs  = [];
        if (startDate)       { dateParts.push("substr(단속일시, 1, 10) >= ?"); dateArgs.push(startDate); }
        if (endDate)         { dateParts.push("substr(단속일시, 1, 10) <= ?"); dateArgs.push(endDate); }
        if (enforcementType) { dateParts.push("단속구분 LIKE ?"); dateArgs.push(`%${enforcementType}%`); }
        const df = dateParts.length ? dateParts.join(' AND ') : null;

        // 기존 조건에 날짜 필터를 조합
        const where = (...conds) => {
          const all = [...conds.filter(Boolean), df].filter(Boolean);
          return all.length ? 'WHERE ' + all.join(' AND ') : '';
        };
        // 모든 쿼리가 동일한 dateArgs를 사용
        const q = (sql) => this.db.prepare(sql).all(...dateArgs);

        const totals = q(
          `SELECT 단속구분, COUNT(*) as cnt FROM enforcement ${where()} GROUP BY 단속구분`
        );

        const topDong = q(`
          SELECT 단속동, COUNT(*) as cnt FROM enforcement
          ${where('단속동 IS NOT NULL')}
          GROUP BY 단속동 ORDER BY cnt DESC LIMIT 10
        `);

        // 전체 읍면동 (LIMIT 없음 — 모달 전체 목록용)
        const allDong = q(`
          SELECT 단속동, COUNT(*) as cnt FROM enforcement
          ${where('단속동 IS NOT NULL')}
          GROUP BY 단속동 ORDER BY cnt DESC
        `);

        // LIMIT 50: 정규화·병합 후 TOP 10 추출 (같은 조문 다른 표기 포함)
        const byViolation = q(`
          SELECT 위반법규, COUNT(*) as cnt FROM enforcement
          ${where('위반법규 IS NOT NULL')}
          GROUP BY 위반법규 ORDER BY cnt DESC LIMIT 50
        `);

        // 전체 위반법규 (LIMIT 없음 — 모달 전체 목록용)
        const allViol = q(`
          SELECT 위반법규, COUNT(*) as cnt FROM enforcement
          ${where('위반법규 IS NOT NULL')}
          GROUP BY 위반법규 ORDER BY cnt DESC
        `);

        const byMonth = q(`
          SELECT substr(단속일시, 1, 7) as month, COUNT(*) as cnt
          FROM enforcement ${where('단속일시 IS NOT NULL')}
          GROUP BY month ORDER BY month
        `);

        const byZone = q(`
          SELECT 단속특별지역, COUNT(*) as cnt FROM enforcement
          ${where("단속특별지역 IS NOT NULL AND 단속특별지역 != ''")}
          GROUP BY 단속특별지역 ORDER BY cnt DESC
        `);

        const totalAll  = totals.reduce((s, r) => s + r.cnt, 0);
        const totalsMap = totals.reduce((acc, r) => { acc[r.단속구분] = r.cnt; return acc; }, {});

        return { totals: totalsMap, totalAll, topDong, allDong, byViolation, allViol, byMonth, byZone };
      } catch (e) {
        console.error('data:getEnforcementStats error:', e);
        return { totals: {}, totalAll: 0, topDong: [], byViolation: [], byMonth: [], byZone: [] };
      }
    });

    // 11. 비밀번호 변경
    ipcMain.handle('auth:changePassword', (event, { currentPw, newPw }) => {
      try {
        const row = this.db.prepare('SELECT value FROM app_config WHERE key = ?').get('admin_password');
        if (!row || !bcrypt.compareSync(currentPw, row.value)) {
          return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
        }
        const hash = bcrypt.hashSync(newPw, 10);
        this.db.prepare('UPDATE app_config SET value=? WHERE key=?').run(hash, 'admin_password');
        const now = new Date().toISOString();
        this.db.prepare('INSERT OR REPLACE INTO app_config (key,value) VALUES (?,?)').run('pw_changed_at', now);
        return { success: true };
      } catch (e) { return { success: false, message: e.message }; }
    });

    // 12. CCTV 데이터 JSON 내보내기
    ipcMain.handle('data:exportCCTV', async () => {
      try {
        const rows = this.db.prepare('SELECT * FROM cctv').all();
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'CCTV 데이터 내보내기',
          defaultPath: `cctv_export_${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: 'JSON 파일', extensions: ['json'] }]
        });
        if (canceled || !filePath) return { success: false, canceled: true };
        fs.writeFileSync(filePath, JSON.stringify({ data: rows }, null, 2), 'utf8');
        return { success: true, count: rows.length };
      } catch (e) { return { success: false, error: e.message }; }
    });

    // 13. 단속 데이터 Excel 내보내기
    ipcMain.handle('data:exportEnforcement', async () => {
      try {
        const rows = this.db.prepare('SELECT * FROM enforcement').all();
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: '단속 데이터 내보내기',
          defaultPath: `enforcement_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
          filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
        });
        if (canceled || !filePath) return { success: false, canceled: true };
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '단속데이터');
        XLSX.writeFile(wb, filePath);
        return { success: true, count: rows.length };
      } catch (e) { return { success: false, error: e.message }; }
    });

    // 14. CCTV DB 초기화
    ipcMain.handle('db:resetCCTV', () => {
      try {
        this.db.prepare('DELETE FROM cctv').run();
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });

    // 15. 단속 DB 초기화
    ipcMain.handle('db:resetEnforcement', () => {
      try {
        this.db.prepare('DELETE FROM enforcement').run();
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });

    // 16. 앱 정보
    ipcMain.handle('system:getAppInfo', () => {
      try {
        const pkg = require(path.join(this.appPath, 'package.json'));
        const dbPath = path.join(this.appPath, 'data', 'app.db');
        const dataDir = path.join(this.appPath, 'data');
        const pwRow = this.db.prepare("SELECT value FROM app_config WHERE key='pw_changed_at'").get();
        return {
          appVersion: pkg.version,
          electronVersion: process.versions.electron || '—',
          nodeVersion: process.versions.node || '—',
          dbPath,
          dataDir,
          pwChangedAt: pwRow?.value || null
        };
      } catch (e) { return {}; }
    });

    // 17. DB 폴더 열기
    ipcMain.handle('system:openDbFolder', () => {
      try {
        const { shell } = require('electron');
        shell.openPath(path.join(this.appPath, 'data'));
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });

    // 18. 맵 영역 캡처 (선택영역 리포트용)
    ipcMain.handle('system:captureMap', async (event, rect) => {
      try {
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return null;
        const img = await win.webContents.capturePage(rect || undefined);
        return img.toDataURL();
      } catch (e) {
        console.error('system:captureMap error:', e);
        return null;
      }
    });

    // 19. 파일 추가 및 가져오기 (멀티 파일 선택 → data/ 복사)
    ipcMain.handle('data:addExcelFiles', async (event) => {
      try {
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.fromWebContents(event.sender);
        const { filePaths, canceled } = await dialog.showOpenDialog(win, {
          title: 'Excel 단속자료 파일 선택',
          filters: [{ name: 'Excel 파일', extensions: ['xlsx', 'xls'] }],
          properties: ['openFile', 'multiSelections']
        });
        if (canceled || !filePaths?.length) return { success: false, canceled: true };
        const dataDir = path.join(this.appPath, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const added = [];
        for (const srcPath of filePaths) {
          const fileName = path.basename(srcPath);
          fs.copyFileSync(srcPath, path.join(dataDir, fileName));
          added.push(fileName);
        }
        return { success: true, files: added };
      } catch (e) {
        console.error('data:addExcelFiles error:', e);
        return { success: false, error: e.message };
      }
    });

    // 20. 리포트 PDF 저장
    ipcMain.handle('report:exportPDF', async (event) => {
      try {
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return { success: false, error: '창 참조 실패' };

        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          marginsType: 1
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        const { filePath, canceled } = await dialog.showSaveDialog(win, {
          title: '리포트 PDF 저장',
          defaultPath: `단속현황보고서_${dateStr}.pdf`,
          filters: [{ name: 'PDF 파일', extensions: ['pdf'] }]
        });

        if (canceled || !filePath) return { success: false, canceled: true };
        fs.writeFileSync(filePath, pdfData);
        return { success: true };
      } catch (e) {
        console.error('report:exportPDF error:', e);
        return { success: false, error: e.message };
      }
    });
  }
}

module.exports = IpcHandlers;
