-- ユーザーのデフォルトパスワードを設定（ユーザー名と同じ）
UPDATE members SET password = username WHERE role = 'user' AND password IS NULL;
