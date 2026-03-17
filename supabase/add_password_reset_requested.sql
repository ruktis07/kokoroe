-- 既存の Supabase で members テーブルに「パスワードリセット依頼」用の列を追加する場合に実行してください。
-- 新規に init_schema.sql でテーブルを作った場合は不要です。

ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ;
