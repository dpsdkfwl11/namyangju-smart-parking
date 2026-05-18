const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(appPath) {
    const dataDir = path.join(appPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const dbPath = path.join(dataDir, 'app.db');
    this.db = new Database(dbPath, { verbose: console.log });
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
