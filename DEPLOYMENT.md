# Vercel + Supabase デプロイ手順

このドキュメントでは、本アプリを **Vercel**（フロント・API）と **Supabase**（PostgreSQL）で運用する手順を説明します。

---

## 1. Supabase の準備

### 1.1 プロジェクト作成

1. [Supabase](https://supabase.com) にログインし、**New project** でプロジェクトを作成します。
2. リージョンとデータベースパスワードを設定し、作成完了を待ちます。

### 1.2 Prisma 用ユーザー作成（推奨）

Supabase の **SQL Editor** で以下を実行し、Prisma 専用ユーザーを作成します。

```sql
-- 強力なパスワードに置き換えてください
CREATE USER "prisma" WITH PASSWORD 'your_secure_password' BYPASSRLS CREATEDB;
GRANT "prisma" TO "postgres";
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
```

### 1.3 接続文字列の取得

1. Supabase ダッシュボードで **Project Settings** → **Database** を開く。
2. **Connection string** の **URI** を確認する。
3. 次の2種類を用意します（「Use connection pooling」の **Session mode** と **Transaction mode** を切り替えて表示）:

| 用途 | ポート | 変数名 | 備考 |
|------|--------|--------|------|
| アプリ実行（Vercel） | **6543** | `DATABASE_URL` | Transaction mode。末尾に `?pgbouncer=true` を付ける |
| マイグレーション | **5432** | `DIRECT_URL` | Session mode または Direct |

**例（プレースホルダーは実際の値に置き換え）:**

```env
# アプリ用（Vercel の環境変数に設定）
DATABASE_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# マイグレーション用（ローカルで prisma migrate を実行するとき用）
DIRECT_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

- `[PROJECT-REF]` → プロジェクトの Reference ID（Database 設定画面に表示）
- `[PASSWORD]` → 上で設定した Prisma ユーザーのパスワード
- `[REGION]` → リージョン（例: `ap-northeast-1`）

---

## 2. データベースのマイグレーション

Supabase の DB を初めて使う場合は、ローカルでマイグレーションを実行します。

```bash
# .env に DATABASE_URL と DIRECT_URL を設定したうえで
cp .env.example .env
# .env を編集して Supabase の接続情報を入れる

npx prisma migrate dev --name init
# または既存スキーマを反映するだけなら
npx prisma db push
```

既存のマイグレーションがある場合は:

```bash
npx prisma migrate deploy
```

シードデータを入れる場合:

```bash
npx prisma db seed
```

---

## 3. Vercel の準備

### 3.1 プロジェクトのデプロイ

1. [Vercel](https://vercel.com) にログインし、**Add New** → **Project** でこのリポジトリをインポートします。
2. **Framework Preset** は **Next.js** のままにします。
3. **Root Directory** はリポジトリルートのままにします。
4. **Build Command** は `prisma generate && next build`（`package.json` の `build` で既に指定済みのため、未指定で問題ありません）。

### 3.2 環境変数の設定

Vercel の **Settings** → **Environment Variables** で次を追加します。

| 名前 | 値 | 備考 |
|------|-----|------|
| `DATABASE_URL` | 上記の **6543** の接続文字列（`?pgbouncer=true` 付き） | Production / Preview / Development に設定 |
| `DIRECT_URL` | 上記の **5432** の接続文字列 | 本番で `prisma migrate deploy` を Vercel で行う場合や、ビルド時の Prisma 用。通常は Vercel ではマイグレーションを実行しないので、同じ値でも可 |

- **重要:** Vercel 上でマイグレーションを実行しない場合は、`DIRECT_URL` に 5432 の URL を入れておけば、ビルドがスキーマを参照する際に使われます。アプリのランタイムでは `DATABASE_URL`（6543）のみが使われます。

### 3.3 デプロイ

**Deploy** を実行し、ビルドが成功すれば完了です。カスタムドメインの設定は Vercel の **Settings** → **Domains** から行えます。

---

## 4. 運用の注意点

- **マイグレーション:** 本番のスキーマ変更は、ローカルまたは CI から `prisma migrate deploy` を実行し、Supabase に接続して行うことを推奨します。Vercel のビルドで毎回マイグレーションは実行しません。
- **接続数:** Supabase の無料枠では接続数に制限があります。`DATABASE_URL` に 6543（Transaction mode）と `?pgbouncer=true` を使うことで、Vercel のサーバーレス環境で接続数が抑えられます。
- **認証:** 現在のアプリは Cookie ベースの独自セッションです。Supabase Auth に移行する場合は別途実装が必要です。

---

## 5. トラブルシューティング

- **「prepared statement does not exist」:** `DATABASE_URL` に `?pgbouncer=true` を付け、ポート 6543（Transaction mode）を使っているか確認してください。
- **マイグレーションが失敗する:** `DIRECT_URL`（ポート 5432）を使っているか確認し、Supabase の **Database** → **Connection string** の **Session mode** の URL と一致させてください。
- **ビルドで Prisma が見つからない:** `package.json` の `build` が `prisma generate && next build` になっているか、Vercel の **Build Command** が上書きしていないか確認してください。
