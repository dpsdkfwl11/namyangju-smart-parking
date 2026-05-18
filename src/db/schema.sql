-- schema.sql
CREATE TABLE IF NOT EXISTS cctv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cctv_name TEXT NOT NULL,
  install_address TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  install_date TEXT,
  management_number TEXT,
  status TEXT DEFAULT '운영중',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geojson_zone (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  zone_type TEXT,
  properties TEXT,
  geometry TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cctv_status ON cctv(status);
CREATE INDEX IF NOT EXISTS idx_cctv_location ON cctv(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_zone_type ON geojson_zone(zone_type);

-- 단속 데이터 (고정형CCTV / 주행형CCTV / 시민신고웹 통합)
CREATE TABLE IF NOT EXISTS enforcement (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  단속일시      TEXT,
  단속동        TEXT,
  단속장소      TEXT,
  단속구분      TEXT,
  위반법규      TEXT,
  단속특별지역  TEXT,
  gps_x         REAL,
  gps_y         REAL,
  source_file   TEXT,
  imported_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enf_type   ON enforcement(단속구분);
CREATE INDEX IF NOT EXISTS idx_enf_date   ON enforcement(단속일시);
CREATE INDEX IF NOT EXISTS idx_enf_dong   ON enforcement(단속동);
CREATE INDEX IF NOT EXISTS idx_enf_source ON enforcement(source_file);
