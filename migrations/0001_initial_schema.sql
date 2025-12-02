-- メンバーテーブル
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  team TEXT CHECK(team IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J')),
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
  password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 評価項目テーブル
CREATE TABLE IF NOT EXISTS evaluation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  major_category TEXT NOT NULL DEFAULT '',
  minor_category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 評価データテーブル
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluator_id INTEGER NOT NULL,
  evaluated_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluator_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluated_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES evaluation_items(id) ON DELETE CASCADE,
  UNIQUE(evaluator_id, evaluated_id, item_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_members_team ON members(team);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated ON evaluations(evaluated_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_item ON evaluations(item_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_items_order ON evaluation_items(display_order);

-- 管理者アカウント初期データ（チーム所属なし）
INSERT OR IGNORE INTO members (username, name, team, role, password) 
VALUES ('admin', '管理者', NULL, 'admin', 'admin');
