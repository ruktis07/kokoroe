-- =============================================================================
-- 緊急用: 管理者パスワードを Supabase SQL Editor から直接リセットする
--
-- 想定ケース:
--   管理者が1人だけ、または全管理者がログイン不能になり、
--   アプリの管理者画面からパスワードリセットできない場合の「最後の砦」。
--
-- 使い方:
--   1. Supabase ダッシュボード → SQL Editor を開く
--   2. STEP 1 で管理者ユーザーを確認
--   3. STEP 2 の target_username / new_password を書き換える
--   4. STEP 2 を実行
--   5. STEP 3 で更新日時が変わったことを確認
--   6. アプリに戻り、新しいパスワードでログイン
--
-- 注意:
--   - 実行前に target_username が正しい管理者であることを必ず確認すること。
--   - new_password は一時パスワードとして扱い、ログイン後すぐ管理者画面の
--     「設定」タブから本人用のパスワードに変更すること。
--   - このファイルは緊急時だけ使う。普段は管理者画面のリセット機能を使う。
-- =============================================================================


-- =============================================================================
-- STEP 1: 管理者アカウントを確認
-- =============================================================================
SELECT
  id,
  username,
  name,
  team,
  role,
  updated_at
FROM members
WHERE role = 'admin'
ORDER BY id;


-- =============================================================================
-- STEP 2: 管理者パスワードをリセット
--
-- 下の2つを書き換えてから実行する:
--   target_username: リセット対象の username
--   new_password:    新しい一時パスワード
--
-- pgcrypto の crypt + gen_salt('bf') で bcrypt ハッシュを保存する。
-- アプリ側のログイン処理は bcrypt ハッシュ（$2 で始まる値）に対応済み。
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH params AS (
  SELECT
    'admin'::text AS target_username,
    'CHANGE_ME_TEMP_PASSWORD'::text AS new_password
),
target AS (
  SELECT m.id
  FROM members m
  JOIN params p ON p.target_username = m.username
  WHERE m.role = 'admin'
)
UPDATE members
SET
  password = crypt((SELECT new_password FROM params), gen_salt('bf')),
  password_reset_requested_at = NULL,
  updated_at = now()
WHERE id IN (SELECT id FROM target)
RETURNING
  id,
  username,
  name,
  role,
  updated_at;


-- =============================================================================
-- STEP 3: 更新確認
--
-- STEP 2 で指定した username に書き換えて実行する。
-- password は中身を表示せず、bcrypt 形式かどうかだけ確認する。
-- =============================================================================
SELECT
  id,
  username,
  name,
  role,
  password LIKE '$2%' AS password_is_bcrypt,
  updated_at
FROM members
WHERE username = 'admin'
  AND role = 'admin';


-- =============================================================================
-- 代替案: pgcrypto が使えない場合のみ
--
-- このアプリは後方互換として平文パスワードにも対応しているため、
-- 最悪の場合は下記でもログイン復旧できる。
-- ただし平文保存になるため、ログイン後すぐ管理者画面の「設定」タブから
-- bcrypt 化された正式パスワードへ変更すること。
--
-- UPDATE members
-- SET
--   password = 'CHANGE_ME_TEMP_PASSWORD',
--   password_reset_requested_at = NULL,
--   updated_at = now()
-- WHERE username = 'admin'
--   AND role = 'admin'
-- RETURNING id, username, name, role, updated_at;
-- =============================================================================
