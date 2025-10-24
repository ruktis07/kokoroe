-- テストデータ: 評価項目
INSERT OR IGNORE INTO evaluation_items (id, name, description, display_order) VALUES 
  (1, 'コミュニケーション能力', 'チーム内での情報共有や意思疎通の能力', 1),
  (2, '責任感', '業務に対する責任感と遂行能力', 2),
  (3, '協調性', 'チームワークと他者との協力姿勢', 3),
  (4, '問題解決能力', '課題発見と解決に向けた行動力', 4),
  (5, '専門スキル', '担当業務に必要な専門知識と技術', 5);

-- テストデータ: メンバー（チームA）
INSERT OR IGNORE INTO members (id, username, name, team, role, password) VALUES 
  (2, 'user001', '田中太郎', 'A', 'user', NULL),
  (3, 'user002', '佐藤花子', 'A', 'user', NULL),
  (4, 'user003', '鈴木一郎', 'A', 'user', NULL);

-- テストデータ: メンバー（チームB）
INSERT OR IGNORE INTO members (id, username, name, team, role, password) VALUES 
  (5, 'user004', '高橋美咲', 'B', 'user', NULL),
  (6, 'user005', '伊藤健太', 'B', 'user', NULL),
  (7, 'user006', '渡辺由美', 'B', 'user', NULL);
