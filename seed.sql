-- テストデータ: 評価項目（大項目・中項目・説明の構造）
INSERT OR IGNORE INTO evaluation_items (id, major_category, minor_category, name, description, display_order) VALUES 
  (1, '対人スキル', 'コミュニケーション能力', '対人スキル - コミュニケーション能力', 'チーム内での情報共有や意思疎通の能力', 1),
  (2, '対人スキル', '協調性', '対人スキル - 協調性', 'チームワークと他者との協力姿勢', 2),
  (3, '業務遂行力', '責任感', '業務遂行力 - 責任感', '業務に対する責任感と遂行能力', 3),
  (4, '業務遂行力', '問題解決能力', '業務遂行力 - 問題解決能力', '課題発見と解決に向けた行動力', 4),
  (5, '専門性', '専門スキル', '専門性 - 専門スキル', '担当業務に必要な専門知識と技術', 5);

-- テストデータ: メンバー（チームA）
-- パスワードはユーザー名と同じ
INSERT OR IGNORE INTO members (id, username, name, team, role, password) VALUES 
  (2, 'user001', '田中太郎', 'A', 'user', 'user001'),
  (3, 'user002', '佐藤花子', 'A', 'user', 'user002'),
  (4, 'user003', '鈴木一郎', 'A', 'user', 'user003');

-- テストデータ: メンバー（チームB）
INSERT OR IGNORE INTO members (id, username, name, team, role, password) VALUES 
  (5, 'user004', '高橋美咲', 'B', 'user', 'user004'),
  (6, 'user005', '伊藤健太', 'B', 'user', 'user005'),
  (7, 'user006', '渡辺由美', 'B', 'user', 'user006');
