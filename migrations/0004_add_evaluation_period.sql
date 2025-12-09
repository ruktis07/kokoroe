-- 評価データに年月カラムを追加
ALTER TABLE evaluations ADD COLUMN year_month TEXT DEFAULT NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_evaluations_year_month ON evaluations(year_month);

-- 既存データに現在の年月を設定（YYYY-MM形式）
UPDATE evaluations SET year_month = strftime('%Y-%m', 'now') WHERE year_month IS NULL;
