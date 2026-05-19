const fs     = require('fs');
const path   = require('path');

const DEFAULTS = { width: 1280, height: 800, maximized: false };

class WindowState {
  constructor(userDataPath) {
    this._file  = path.join(userDataPath, 'window-state.json');
    this._state = this._load();
  }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this._file, 'utf8'));
      if (!Number.isFinite(data.width)  || data.width  < 400) return { ...DEFAULTS };
      if (!Number.isFinite(data.height) || data.height < 300) return { ...DEFAULTS };
      return { ...DEFAULTS, ...data };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  // 저장된 위치가 현재 연결된 모니터 안에 있는지 확인
  isOnScreen(electronScreen) {
    const { x, y, width, height } = this._state;
    if (x == null || y == null) return false;
    return electronScreen.getAllDisplays().some(d => {
      const b = d.bounds;
      return x < b.x + b.width  && x + width  > b.x &&
             y < b.y + b.height && y + height > b.y;
    });
  }

  // BrowserWindow 생성 옵션 반환
  getBrowserWindowOptions() {
    const opts = {
      width:  this._state.width,
      height: this._state.height,
    };
    if (this._state.x != null) opts.x = this._state.x;
    if (this._state.y != null) opts.y = this._state.y;
    return opts;
  }

  // 윈도우 닫힐 때 호출 — close 이벤트에서 사용 (destroyed 전)
  save(win) {
    try {
      if (win.isDestroyed()) return;
      const maximized = win.isMaximized();
      // 최대화 상태라면 복원 크기/위치를 getNormalBounds()로 얻음
      const bounds = maximized ? win.getNormalBounds() : win.getBounds();
      this._state = {
        width:    bounds.width,
        height:   bounds.height,
        x:        bounds.x,
        y:        bounds.y,
        maximized
      };
      fs.writeFileSync(this._file, JSON.stringify(this._state, null, 2), 'utf8');
    } catch (_) {}
  }
}

module.exports = WindowState;
