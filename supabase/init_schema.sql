-- ローカル不要: Supabase の SQL Editor に貼って実行するだけでテーブルが作成されます。
-- Prisma の schema.prisma と対応しています。

-- 1. members
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  team CHAR(1),
  role TEXT NOT NULL DEFAULT 'user',
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS members_team_idx ON members(team);
CREATE INDEX IF NOT EXISTS members_username_idx ON members(username);

-- 2. evaluation_items
CREATE TABLE IF NOT EXISTS evaluation_items (
  id SERIAL PRIMARY KEY,
  major_category TEXT NOT NULL DEFAULT '',
  minor_category TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evaluation_items_display_order_idx ON evaluation_items(display_order);

-- 3. evaluation_periods
CREATE TABLE IF NOT EXISTS evaluation_periods (
  id SERIAL PRIMARY KEY,
  year_month VARCHAR(7) NOT NULL UNIQUE,
  start_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evaluation_periods_year_month_idx ON evaluation_periods(year_month);
CREATE INDEX IF NOT EXISTS evaluation_periods_is_active_idx ON evaluation_periods(is_active);

-- 4. evaluations（members, evaluation_items のあと）
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  evaluated_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES evaluation_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  year_month VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluator_id, evaluated_id, item_id, year_month)
);
CREATE INDEX IF NOT EXISTS evaluations_evaluator_id_idx ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS evaluations_evaluated_id_idx ON evaluations(evaluated_id);
CREATE INDEX IF NOT EXISTS evaluations_item_id_idx ON evaluations(item_id);
CREATE INDEX IF NOT EXISTS evaluations_year_month_idx ON evaluations(year_month);

-- 5. others_score_adjustments
CREATE TABLE IF NOT EXISTS others_score_adjustments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES evaluation_items(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  adjusted_score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, item_id, year_month)
);
CREATE INDEX IF NOT EXISTS others_score_adjustments_member_id_idx ON others_score_adjustments(member_id);

-- 6. tab_view_logs
CREATE TABLE IF NOT EXISTS tab_view_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tab VARCHAR(20) NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tab_view_logs_user_id_idx ON tab_view_logs(user_id);
CREATE INDEX IF NOT EXISTS tab_view_logs_viewed_at_idx ON tab_view_logs(viewed_at);

-- updated_at を自動更新するトリガー（PostgreSQL）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'members_updated_at') THEN
    CREATE TRIGGER members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'evaluation_items_updated_at') THEN
    CREATE TRIGGER evaluation_items_updated_at BEFORE UPDATE ON evaluation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'evaluations_updated_at') THEN
    CREATE TRIGGER evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'others_score_adjustments_updated_at') THEN
    CREATE TRIGGER others_score_adjustments_updated_at BEFORE UPDATE ON others_score_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'evaluation_periods_updated_at') THEN
    CREATE TRIGGER evaluation_periods_updated_at BEFORE UPDATE ON evaluation_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;