const fs   = require('fs');
const path = require('path');

class Logger {
  constructor(logDir) {
    this.logDir = logDir;
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) {}
    this._cleanOldLogs(30);
  }

  _timestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  _logFilePath() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    return path.join(this.logDir, `app-${date}.log`);
  }

  _write(level, args) {
    const msg  = args.map(a =>
      a instanceof Error ? `${a.message}\n${a.stack || ''}` :
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ');
    const line = `[${this._timestamp()}] [${level}] ${msg}\n`;
    try { fs.appendFileSync(this._logFilePath(), line, 'utf8'); } catch (_) {}
    // 콘솔에도 출력
    if (level === 'ERROR') console.error(`[${level}]`, msg);
    else if (level === 'WARN')  console.warn(`[${level}]`, msg);
    else                        console.log(`[${level}]`, msg);
  }

  info(...args)  { this._write('INFO',  args); }
  warn(...args)  { this._write('WARN',  args); }
  error(...args) { this._write('ERROR', args); }

  // 30일 초과 로그 자동 삭제
  _cleanOldLogs(keepDays) {
    try {
      const cutoff = Date.now() - keepDays * 86400_000;
      fs.readdirSync(this.logDir)
        .filter(f => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(f))
        .forEach(f => {
          const fp = path.join(this.logDir, f);
          try { if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp); } catch (_) {}
        });
    } catch (_) {}
  }
}

module.exports = Logger;
