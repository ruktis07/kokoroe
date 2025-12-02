-- 管理者のチームをNULLに変更
UPDATE members SET team = NULL WHERE role = 'admin';

-- 評価項目に大項目・中項目カラムを追加（既に存在する場合はスキップ）
-- SQLiteでは既存テーブルへの列追加は ALTER TABLE ADD COLUMN のみサポート
-- 既存のマイグレーションで定義済みなので、ここでは既存データの更新のみ

-- 既存の評価項目データを更新（大項目・中項目の設定）
UPDATE evaluation_items SET major_category = 'ビジネススキル', minor_category = 'コミュニケーション' WHERE name = 'コミュニケーション能力';
UPDATE evaluation_items SET major_category = 'ビジネススキル', minor_category = '業務遂行' WHERE name = '責任感';
UPDATE evaluation_items SET major_category = 'ビジネススキル', minor_category = 'チームワーク' WHERE name = '協調性';
UPDATE evaluation_items SET major_category = 'ビジネススキル', minor_category = '問題解決' WHERE name = '問題解決能力';
UPDATE evaluation_items SET major_category = 'テクニカルスキル', minor_category = '専門性' WHERE name = '専門スキル';
