# Vercel + Supabase デプロイ手順

このドキュメントでは、本アプリを **Vercel**（フロント・API）と **Supabase**（PostgreSQL）で運用する手順を説明します。

---

## やること一覧（何をすればいいか）

| # | どこで | やること |
|---|--------|----------|
| 1 | Supabase | プロジェクトを作成する |
| 2 | Supabase SQL Editor | Prisma 用ユーザーを作る SQL を実行する |
| 3 | Supabase | Project Settings → Database で接続文字列を2種類コピーする（ポート 6543 と 5432） |
| 4 | Supabase SQL Editor | **テーブル作成:** `supabase/init_schema.sql` の内容を貼って実行する |
| 5 | ローカル | **データ取り込み用 SQL を生成:** `npm run export-for-production` を実行する（ユーザー・項目・評価期間のみ。採点結果は含まない） |
| 6 | Supabase SQL Editor | **データ投入:** 生成された `supabase/seed-members-and-items.sql` の内容を貼って実行する |
| 7 | Vercel | このリポジトリをインポートしてプロジェクトを作成する |
| 8 | Vercel | Settings → Environment Variables で `DATABASE_URL`（6543・pgbouncer=true）と `DIRECT_URL`（5432）を登録する |
| 9 | Vercel | Deploy してビルドが通れば完了 |

**ローカル開発を今まで通り使う場合:** `.env` に `DATABASE_URL` と `DIRECT_URL` を**同じローカルDBのURL**で書く（テストデータはそのまま使える）。詳しくは下の「ローカル開発」を参照。

---

## ローカル開発（従来どおり・テストデータもそのまま）

**ローカルで動かすときは、今までと同じ動きになります。** 既存のテストデータもそのまま使えます。

- **やること:** `.env` に `DATABASE_URL` と `DIRECT_URL` の **両方** を、**同じローカルDBのURL** で設定する。
- すでに `DATABASE_URL` だけある場合は、`DIRECT_URL` に同じ値をコピーして追加するだけです。
- `npm run dev` / `prisma migrate dev` / `prisma db push` / `prisma db seed` は今まで通り使えます。挙動は変わりません。

```env
# 例: ローカル PostgreSQL を今まで通り使う場合
DATABASE_URL="postgresql://user:password@localhost:5432/kokoroe"
DIRECT_URL="postgresql://user:password@localhost:5432/kokoroe"
```

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

ここでは、Supabase 上に **テーブル（スキーマ）を作る** 手順を説明します。  
「マイグレーション」＝アプリで使うテーブル（members, evaluation_items など）を Supabase の PostgreSQL に作成すること、と考えるとよいです。

---

### 2.1 やり方の選択

次の **2通り** があります。**ローカルでコマンドを打たずに済ませたい場合は A** を選んでください。

| 方法 | どこでやるか | いつ向きか |
|------|----------------|------------|
| **A. Supabase の SQL を実行する** | Supabase の画面だけ | ローカルで Prisma を動かさない・テーブルだけ作りたいとき |
| **B. ローカルで Prisma を使う** | 自分のPC（ターミナル） | すでに Prisma のマイグレーション履歴を管理しているとき |

---

### 2.2 方法 A: Supabase の SQL Editor でテーブルを作る（ローカル不要）

**やること:** プロジェクトに含まれている `supabase/init_schema.sql` を、Supabase の **SQL Editor** に貼り付けて実行するだけです。

#### 手順

1. **Supabase ダッシュボードを開く**  
   [Supabase](https://supabase.com) にログインし、対象のプロジェクト（例: kokoroe 用に作ったプロジェクト）を選択する。

2. **SQL Editor を開く**  
   左サイドバーの **「SQL Editor」** をクリックする。  
   （初回は「New query」などと表示されていることがあります。）

3. **新しいクエリを開く**  
   「+ New query」や「New query」ボタンをクリックし、空の入力欄を表示する。

4. **init_schema.sql の内容を貼り付ける**  
   - このリポジトリの **`supabase/init_schema.sql`** をエディタで開く。  
   - ファイルの中身を **すべて** 選択してコピーする（Ctrl+A → Ctrl+C）。  
   - Supabase の SQL Editor の入力欄に **貼り付ける**（Ctrl+V）。

5. **実行する**  
   画面下部の **「Run」**（または「実行」）ボタンをクリックする。  
   成功すると「Success. No rows returned」のようなメッセージが出ます。

6. **テーブルができたか確認する（任意）**  
   左サイドバーの **「Table Editor」** を開くと、`members` や `evaluation_items` などのテーブルが一覧に出ていれば完了です。

これで **テーブル作成（マイグレーション）は完了** です。次の「2.5 本番用データの取り込み」で、ユーザー・項目・評価期間のデータを入れます。

---

### 2.3 方法 B: ローカルで Prisma を使ってマイグレーションする

**.env に Supabase の接続情報（DATABASE_URL と DIRECT_URL）を入れたうえで**、自分のPCのターミナルで次を実行します。

#### 初めて Supabase にテーブルを作る場合

```bash
# プロジェクトのルートフォルダで
npx prisma migrate dev --name init
```

または「マイグレーション履歴は作らず、スキーマだけ反映したい」場合:

```bash
npx prisma db push
```

- `migrate dev` … マイグレーション履歴が残り、あとから本番で `migrate deploy` が使える。  
- `db push` … 今の schema.prisma の内容をそのまま DB に反映するだけ（履歴は残らない）。

#### すでにマイグレーション履歴がある場合

本番（Supabase）に、すでにあるマイグレーションを適用するだけなら:

```bash
npx prisma migrate deploy
```

#### シード（初期データ）を入れる場合

ユーザーや項目を Prisma の seed で入れたい場合（ローカル用のテストデータなど）:

```bash
npx prisma db seed
```

※ 本番では「2.5 本番用データの取り込み」のエクスポート用 SQL を使う想定です。

---

### 2.4 ここまでのまとめ

- **方法 A:** Supabase の SQL Editor で `supabase/init_schema.sql` を実行 → テーブルができる（ローカル不要）。  
- **方法 B:** ローカルで `prisma migrate dev` または `prisma db push` を実行 → Supabase にテーブルができる。  

どちらか一方を実行すれば、**2. データベースのマイグレーション** は完了です。次は「2.5」でデータを取り込みます。

---

### 2.5 本番用データの取り込み（ユーザー・項目・評価期間のみ・採点結果は含まない）

Vercel + Supabase では、**ユーザー（members）・項目（evaluation_items）・評価期間（evaluation_periods）だけ**を取り込み、**採点結果（evaluations 等）は取り込まない**運用にします。

#### 手順（3ステップ）

**ステップ 1: ローカルで「取り込み用 SQL」を生成する**

- **重要:** `.env` の `DATABASE_URL` と `DIRECT_URL` を **ローカルDB**（今まで使っているテスト用 PostgreSQL）にしておく。  
  - Supabase を指したままだと「Authentication failed」になる。エクスポートは「ローカルから」データを読む処理です。
- プロジェクトのルートで次を実行する:
  ```bash
  npm run export-for-production
  ```
- 実行が終わると、**`supabase/seed-members-and-items.sql`** というファイルがプロジェクト内に生成される。  
  - 中身は **members / evaluation_items / evaluation_periods だけ**の INSERT 文で、採点結果は含まれない。

**ステップ 2: Supabase にテーブルがあるか確認する**

- まだテーブルを作っていない場合は、**2.2 方法 A** のとおり、Supabase の SQL Editor で **`supabase/init_schema.sql`** を実行してテーブルを作成する。  
- すでに 2.2 または 2.3 でテーブルを作ってあれば、このステップは飛ばしてよい。

**ステップ 3: 生成した SQL を Supabase で実行する**

1. Supabase の **SQL Editor** を開く。  
2. **「+ New query」** で新しいクエリを開く。  
3. 生成された **`supabase/seed-members-and-items.sql`** の内容を **すべて** コピーし、SQL Editor に貼り付ける。  
4. **「Run」** をクリックして実行する。  
5. 成功すると、Supabase の **Table Editor** で `members` や `evaluation_items` を開いたときに、データが入っているはずです。採点結果は入っていません。

---

## 3. Vercel の準備

Vercel にこのアプリをデプロイし、Supabase の DB に接続できるようにします。

---

### 3.1 プロジェクトのデプロイ（詳しい手順）

#### 前提

- このプロジェクトのコードが **GitHub** などにプッシュ済みであること。
- Vercel と GitHub を連携していない場合は、最初に Vercel の画面で GitHub アカウントを接続する。

#### 手順

1. **Vercel にログインする**  
   [https://vercel.com](https://vercel.com) を開き、ログインする。

2. **新規プロジェクトを作成する**  
   - ダッシュボードで **「Add New」** をクリックする。  
   - 一覧から **「Project」** を選ぶ。

3. **リポジトリを選ぶ**  
   - 一覧に GitHub のリポジトリ（例: `ruktis07/kokoroe`）が出るので、その横の **「Import」** をクリックする。  
   - リポジトリが表示されない場合は、**「Adjust GitHub App Permissions」** などで Vercel にリポジトリへのアクセスを許可する。

4. **設定画面で確認する**  
   - **Project Name:** そのままでよい（例: `kokoroe`）。  
   - **Framework Preset:** **Next.js** のまま（自動検出されているはず）。  
   - **Root Directory:** 空のまま（リポジトリのルートが対象）。  
   - **Build Command:** 空のままでよい。`package.json` の `"build": "prisma generate && next build"` が使われる。  
   - **Output Directory:** 空のまま。  
   - **Install Command:** 空のまま（`npm install` が使われる）。

5. **環境変数はここでは入れない**  
   - いったん **「Deploy」** で進める（初回はビルドが失敗してもよい）。  
   - 次の「3.2」で環境変数を追加してから **Redeploy** する。

6. **Deploy をクリックする**  
   - ビルドが始まる。  
   - 環境変数（`DATABASE_URL` / `DIRECT_URL`）をまだ入れていない場合は、ビルドは通っても本番で DB 接続エラーになることがある。その場合は 3.2 で環境変数を入れてから **Redeploy** する。

7. **デプロイ完了後**  
   - 成功すると **「Visit」** で本番URL（例: `https://kokoroe-xxx.vercel.app`）が開く。  
   - 環境変数を入れたあとは、**Deployments** タブ → 最新のデプロイの「⋯」→ **Redeploy** で再デプロイする。

---

### 3.2 環境変数の設定（詳しい手順）

Vercel でアプリが Supabase に接続するには、**環境変数**に接続文字列を登録します。

#### 手順

1. **Vercel にログイン**して、対象のプロジェクト（kokoroe）を開く。

2. **上部メニューで「Settings」をクリック**する。

3. **左サイドバーで「Environment Variables」をクリック**する。
   - ここで「Key（名前）」と「Value（値）」を登録する。

4. **1つ目: DATABASE_URL を追加**
   - **Key:** `DATABASE_URL`（大文字小文字どおりに）
   - **Value:** ポート **6543** の接続文字列。末尾に `?pgbouncer=true` が付いていること。
     - 例:  
       `postgresql://postgres.yfwpgiqsxtdqawgwrhmk:%5Bmizutani-12%5D@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Environment:** 本番だけなら **Production** にチェック。プレビューや開発用にも使うなら **Preview** と **Development** にもチェックを入れる。
   - **Save** をクリックする。

5. **2つ目: DIRECT_URL を追加**
   - **Key:** `DIRECT_URL`
   - **Value:** ポート **5432** の接続文字列（`?pgbouncer=true` は付けない）。
     - 例:  
       `postgresql://postgres.yfwpgiqsxtdqawgwrhmk:%5Bmizutani-12%5D@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`
   - **Environment:** 上と同じでよい（Production 必須。Preview / Development は任意）。
   - **Save** をクリックする。

6. **反映のしかた**
   - 環境変数を追加・変更したあとは、**再デプロイ**しないと本番に反映されない。
   - **Deployments** タブ → 最新のデプロイの「⋯」メニュー → **Redeploy** を選ぶ。
   - または、Git にプッシュすると新しいデプロイが走り、そのときに新しい環境変数が使われる。

#### まとめ（何をどこに入れるか）

| 名前 | 値（例） | 説明 |
|------|----------|------|
| `DATABASE_URL` | ホストが `...pooler.supabase.com` でポートが **6543**、末尾が `?pgbouncer=true` の URL | アプリ実行時・Vercel のランタイムで使用。接続プール経由。 |
| `DIRECT_URL` | 同じホストでポートが **5432** の URL（`?pgbouncer=true` なし） | ビルド時（Prisma がスキーマを読むとき）に使用。 |

- パスワードに `[ ]` が含まれる場合は、URL 内では `%5B` / `%5D` にエンコードする（ローカルの `.env` と同じ値でよい）。
- **重要:** アプリの動作には `DATABASE_URL`（6543）が必須。`DIRECT_URL` はビルドを通すために必要。

### 3.3 再デプロイと確認

1. **環境変数を入れたあと**  
   **Deployments** タブを開く → いちばん上にあるデプロイの **「⋯」（縦三点メニュー）** をクリック → **「Redeploy」** を選ぶ。  
   「Redeploy」で **Deploy** を押すと、新しい環境変数を使ってビルド・デプロイがやり直される。

2. **ビルドが成功したか**  
   同じ Deployments の一覧で、対象のデプロイの **Status** が **Ready**（緑）になっていれば成功。  
   失敗している場合は **「View Function Logs」** やビルドログでエラー内容を確認する。

3. **アプリが動いているか**  
   **「Visit」** で本番URLを開く。ログイン画面が出て、Supabase の members で登録したユーザー（例: admin）でログインできれば、DB 接続も問題ない。

4. **カスタムドメインを使う場合**  
   **Settings** → **Domains** で、自分のドメイン（例: `kokoroe.example.com`）を追加し、表示された DNS 設定をドメイン側で行う。

---

## 4. 運用の注意点

- **マイグレーション:** 本番のスキーマ変更は、ローカルまたは CI から `prisma migrate deploy` を実行し、Supabase に接続して行うことを推奨します。Vercel のビルドで毎回マイグレーションは実行しません。
- **接続数:** Supabase の無料枠では接続数に制限があります。`DATABASE_URL` に 6543（Transaction mode）と `?pgbouncer=true` を使うことで、Vercel のサーバーレス環境で接続数が抑えられます。
- **認証:** 現在のアプリは Cookie ベースの独自セッションです。Supabase Auth に移行する場合は別途実装が必要です。

---

## 4.5 既存の Supabase に列を追加する（パスワードリセット依頼など）

**いつやるか:** すでに Supabase で `members` テーブルを作って運用しているが、アプリ側で新しい列（例: パスワードリセット依頼用の `password_reset_requested_at`）を追加した場合。**新規に `init_schema.sql` だけでテーブルを作った場合は不要**です（その SQL にすでに列が含まれています）。

### 手順 1: Supabase で SQL を実行する

1. **Supabase にログイン**し、対象のプロジェクトを開く。
2. 左メニューで **「SQL Editor」** をクリックする。
3. **「+ New query」** で新しいクエリを開く。
4. 次の SQL を **そのままコピーして** 入力欄に貼り付ける。
   ```sql
   ALTER TABLE members ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ;
   ```
5. 右下の **「Run」**（または実行ボタン）をクリックする。
6. **「Success. No rows returned」** のような表示が出れば完了。エラーが出た場合は、メッセージを確認する（例: テーブル名が違う、権限がないなど）。

**別の列を追加する場合:** プロジェクト内の `supabase/add_password_reset_requested.sql` のように、追加用の SQL ファイルがあればその内容を SQL Editor に貼って実行する。

### 手順 2: ローカルで Prisma を合わせる

Supabase のテーブルに列を足したあと、**自分のPC** で次を実行し、Prisma の型とコードを DB と一致させます。

1. **ターミナル（PowerShell など）を開き、プロジェクトのフォルダに移動する。**
   ```powershell
   cd c:\Users\user\kokoroe
   ```

2. **`.env` が Supabase を指しているか確認する。**  
   この作業中は Supabase の接続情報（`DATABASE_URL` と `DIRECT_URL`）が入っている必要があります。

3. **Prisma Client を再生成する（必須）。**  
   スキーマの変更を TypeScript の型とクライアントに反映します。
   ```powershell
   npx prisma generate
   ```
   - 表示例: `✔ Generated Prisma Client ...`
   - これでアプリから新しい列を読み書きできるようになります。

4. **（任意）DB のスキーマを Prisma と完全に揃えたい場合:**  
   マイグレーション履歴を使っていない場合は、次で「今の Prisma のスキーマ」をそのまま DB に反映できます。
   ```powershell
   npx prisma db push
   ```
   - **注意:** `db push` は、Prisma のスキーマに書いてある内容を DB に反映します。すでに手順 1 で Supabase に列を足してある場合は、多くの場合 **この段階では変更なし** になります。列を足す前に `db push` を使うと、Supabase 側にその列が作られます。
   - マイグレーション（`prisma migrate`）を使っている場合は、新しいマイグレーションを作成してから `prisma migrate deploy` で本番に反映する運用にします。

### まとめ（何をいつやるか）

| やること | どこで | コマンド／操作 |
|----------|--------|----------------|
| DB に列を足す | Supabase の SQL Editor | 上記の `ALTER TABLE ...` を貼って **Run** |
| 型・クライアントを更新 | 自分のPC（プロジェクトフォルダ） | `npx prisma generate` |
| （任意）スキーマを DB に反映 | 自分のPC | `npx prisma db push` または `npx prisma migrate deploy` |

**Vercel について:** コードをプッシュすると Vercel のビルドで `prisma generate` が実行されます。Supabase 側に列を足してあり、`schema.prisma` にその列が書いてあれば、デプロイ後のアプリからもその列を利用できます。

---

## 5. トラブルシューティング

### API連携が取れない・ログインできない

1. **DB 接続の確認**  
   ブラウザで **`https://あなたのアプリ.vercel.app/api/health`** を開く。
   - `{"ok":true}` と表示されれば、Vercel → Supabase の接続は成功している。
   - `{"ok":false,"error":"..."}` のときは、表示されたエラー内容を確認する（下記の環境変数・接続文字列を見直す）。

2. **Vercel の環境変数**
   - **Settings** → **Environment Variables** で **`DATABASE_URL`** と **`DIRECT_URL`** が登録されているか確認する。
   - `DATABASE_URL` は **ポート 6543** で、末尾に **`?pgbouncer=true`** が付いていること。
   - パスワードに `[ ]` が含まれる場合は、URL 内で **`%5B`** / **`%5D`** にエンコードする。
   - 変更したあとは **Redeploy** しないと反映されない。

3. **Supabase にデータがあるか**
   - Supabase の **Table Editor** で **`members`** にユーザー（例: admin）が入っているか確認する。
   - 空の場合は、**2.5 本番用データの取り込み** のとおり `seed-members-and-items.sql` を SQL Editor で実行する。

4. **ブラウザの開発者ツール**
   - **F12** → **Network** タブで、ログインや一覧取得時に **失敗しているリクエスト（赤や 500）** がないか確認する。
   - 失敗している URL をクリックし、**Response** でエラー内容を確認する。

### その他

- **「prepared statement does not exist」:** `DATABASE_URL` に `?pgbouncer=true` を付け、ポート 6543（Transaction mode）を使っているか確認してください。
- **マイグレーションが失敗する:** `DIRECT_URL`（ポート 5432）を使っているか確認し、Supabase の **Database** → **Connection string** の **Session mode** の URL と一致させてください。
- **ビルドで Prisma が見つからない:** `package.json` の `build` が `prisma generate && next build` になっているか、Vercel の **Build Command** が上書きしていないか確認してください。
