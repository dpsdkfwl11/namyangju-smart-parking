const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(appPath, userDataPath) {
    const dataDir = path.join(userDataPath || appPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 기존 설치(appPath/data/app.db)에서 마이그레이션
    const legacyDbPath = path.join(appPath, 'data', 'app.db');
    const dbPath = path.join(dataDir, 'app.db');
    if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
      try { fs.copyFileSync(legacyDbPath, dbPath); } catch (_) {}
    }

    this.db = new Database(dbPath);
    this.initSchema(appPath);
  }

  initSchema(appPath) {
    try {
      const schemaPath = path.join(appPath, 'src', 'db', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      console.log('Database schema initialized.');
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
    }
  }

  getDb() {
    return this.db;
  }
}

module.exports = DatabaseManager;
