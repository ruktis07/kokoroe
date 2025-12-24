-- UNIQUE制約をyear_monthを含むように変更

-- SQLiteでは既存のUNIQUE制約を直接削除できないため、テーブルを再作成する必要がある

-- 1. 一時テーブルを作成
CREATE TABLE IF NOT EXISTS evaluations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluator_id INTEGER NOT NULL,
  evaluated_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
  year_month TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluator_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluated_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES evaluation_items(id) ON DELETE CASCADE,
  UNIQUE(evaluator_id, evaluated_id, item_id, year_month)
);

-- 2. 既存データをコピー（year_monthがNULLの場合もそのままコピー）
INSERT INTO evaluations_new (id, evaluator_id, evaluated_id, item_id, score, year_month, created_at, updated_at)
SELECT id, evaluator_id, evaluated_id, item_id, score, year_month, created_at, updated_at
FROM evaluations;

-- 3. 古いテーブルを削除
DROP TABLE evaluations;

-- 4. 新しいテーブルをリネーム
ALTER TABLE evaluations_new RENAME TO evaluations;

-- 5. インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated ON evaluations(evaluated_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_item ON evaluations(item_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_year_month ON evaluations(year_month);
