-- =============================================================================
-- 所属チーム外への評価レコードを調査・クリーンアップするための SQL
--
-- 背景: bulk API（評価の一括保存）にチームメンバーかどうかのチェックが
--       無かったため、評価者と評価対象が別チームのレコードが残っている可能性がある。
--       特に、評価者がチーム異動後にもセッションが古いまま「全て保存」した場合、
--       異動前のチームメンバーへの評価がそのまま入っていることがある。
--
-- 使い方:
--   Supabase ダッシュボードの SQL Editor で、上から順にひとつずつ実行する。
--   1) STEP 1 で不正候補を SELECT して目視確認
--   2) STEP 2 で件数だけ把握
--   3) 内容が想定通りなら STEP 3 の DELETE 文のコメントを外して実行
--
-- 注意:
--   - DELETE 文は最初コメントアウトしてある。
--   - 実行前に必ず Supabase 側でテーブルのバックアップ（または Export）を取ること。
--   - 「現在のチーム」と一致しないレコードを抽出しているため、評価者が異動する前の
--     正当な評価（A 在籍時に A メンバーを評価したもの）も対象に含まれる。
--     過去の正当データを残したい場合は STEP 1b の方を採用すること。
-- =============================================================================


-- =============================================================================
-- STEP 1: 「評価者の現在のチーム」と「評価対象の現在のチーム」が一致しない
--         評価レコードを全て抽出（並び順: 直近作成順）
-- =============================================================================
SELECT
  e.id                          AS evaluation_id,
  ev.id                         AS evaluator_id,
  ev.username                   AS evaluator_username,
  ev.name                       AS evaluator_name,
  ev.team                       AS evaluator_current_team,
  ev.updated_at                 AS evaluator_member_updated_at,
  ed.id                         AS evaluated_id,
  ed.username                   AS evaluated_username,
  ed.name                       AS evaluated_name,
  ed.team                       AS evaluated_current_team,
  e.year_month,
  e.score,
  e.created_at,
  e.updated_at
FROM evaluations e
JOIN members ev ON ev.id = e.evaluator_id
JOIN members ed ON ed.id = e.evaluated_id
WHERE ev.team IS DISTINCT FROM ed.team
ORDER BY e.created_at DESC;


-- =============================================================================
-- STEP 1b: 「チーム異動後に作成された」不正レコードに絞る（より厳密）
--         評価者の members.updated_at（最終更新日時）より後に作られた評価のみ。
--         updated_at はパスワード更新などでも変わるため完全ではないが、
--         「異動の瞬間より後の評価」を見つける目安になる。
-- =============================================================================
SELECT
  e.id                          AS evaluation_id,
  ev.username                   AS evaluator_username,
  ev.team                       AS evaluator_current_team,
  ev.updated_at                 AS evaluator_member_updated_at,
  ed.username                   AS evaluated_username,
  ed.team                       AS evaluated_current_team,
  e.year_month,
  e.score,
  e.created_at
FROM evaluations e
JOIN members ev ON ev.id = e.evaluator_id
JOIN members ed ON ed.id = e.evaluated_id
WHERE ev.team IS DISTINCT FROM ed.team
  AND e.created_at > ev.updated_at  -- ← updated_at より後＝異動後の評価とみなす
ORDER BY e.created_at DESC;


-- =============================================================================
-- STEP 2: 件数の確認（STEP 1 / 1b に対応）
-- =============================================================================
-- 全体（チーム不一致）の件数
SELECT COUNT(*) AS cross_team_total
FROM evaluations e
JOIN members ev ON ev.id = e.evaluator_id
JOIN members ed ON ed.id = e.evaluated_id
WHERE ev.team IS DISTINCT FROM ed.team;

-- 異動後とみなせる分の件数
SELECT COUNT(*) AS cross_team_after_member_update
FROM evaluations e
JOIN members ev ON ev.id = e.evaluator_id
JOIN members ed ON ed.id = e.evaluated_id
WHERE ev.team IS DISTINCT FROM ed.team
  AND e.created_at > ev.updated_at;


-- =============================================================================
-- STEP 3: 削除（コメントアウトしてある。中身を確認してから実行）
-- =============================================================================

-- 【A 案】全てのチーム不一致レコードを削除する
-- 過去のチーム異動前の正当な評価も削除される点に注意。
-- DELETE FROM evaluations
-- WHERE id IN (
--   SELECT e.id
--   FROM evaluations e
--   JOIN members ev ON ev.id = e.evaluator_id
--   JOIN members ed ON ed.id = e.evaluated_id
--   WHERE ev.team IS DISTINCT FROM ed.team
-- );

-- 【B 案】異動後とみなせる分だけ削除（推奨）
-- DELETE FROM evaluations
-- WHERE id IN (
--   SELECT e.id
--   FROM evaluations e
--   JOIN members ev ON ev.id = e.evaluator_id
--   JOIN members ed ON ed.id = e.evaluated_id
--   WHERE ev.team IS DISTINCT FROM ed.team
--     AND e.created_at > ev.updated_at
-- );

-- 【C 案】特定ユーザー（例: username = '729'）の異動後分だけ削除
-- DELETE FROM evaluations
-- WHERE id IN (
--   SELECT e.id
--   FROM evaluations e
--   JOIN members ev ON ev.id = e.evaluator_id
--   JOIN members ed ON ed.id = e.evaluated_id
--   WHERE ev.username = '729'
--     AND ev.team IS DISTINCT FROM ed.team
-- );


-- =============================================================================
-- STEP 4: 残ってしまった「チーム間採点調整」（others_score_adjustments）への影響確認
--         評価がなくなった月の他者スコア調整値は不整合になる可能性があるため、確認する。
-- =============================================================================
SELECT
  osa.member_id,
  m.username,
  m.team,
  osa.item_id,
  osa.year_month,
  osa.adjusted_score,
  osa.updated_at
FROM others_score_adjustments osa
JOIN members m ON m.id = osa.member_id
WHERE NOT EXISTS (
  SELECT 1 FROM evaluations e
  WHERE e.evaluated_id = osa.member_id
    AND e.item_id = osa.item_id
    AND e.year_month = osa.year_month
)
ORDER BY osa.year_month DESC;
