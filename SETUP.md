# セットアップガイド

このガイドでは、Next.js + PostgreSQL + Prisma Studioの環境をセットアップする手順を詳しく説明します。

## ステップ1: PostgreSQLのインストールとセットアップ

### Windowsの場合

1. **PostgreSQLのダウンロード**
   - https://www.postgresql.org/download/windows/ にアクセス
   - 「Download the installer」をクリック
   - 最新版（PostgreSQL 16推奨）をダウンロード

2. **PostgreSQLのインストール**
   - ダウンロードしたインストーラーを実行
   - インストール中に以下を設定：
     - **Port**: 5432（デフォルト）
     - **Superuser Password**: 後で使うので覚えておく（例: `postgres`）
     - **Locale**: デフォルトでOK

3. **PostgreSQLサービスの確認**
   - Windowsキー + R → `services.msc` を入力
   - 「postgresql-x64-16」（バージョンによって異なる）が「実行中」になっているか確認

### macOSの場合

```bash
# Homebrewを使用してインストール
brew install postgresql@16

# PostgreSQLサービスを起動
brew services start postgresql@16
```

### Linux (Ubuntu/Debian)の場合

```bash
# PostgreSQLをインストール
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQLサービスを起動
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## ステップ2: データベースの作成

### Windowsの場合

1. **pgAdminを開く**（PostgreSQLインストール時に一緒にインストールされます）
   - スタートメニューから「pgAdmin 4」を起動
   - 左側のツリーから「PostgreSQL 16」を展開
   - 「Databases」を右クリック → 「Create」 → 「Database...」
   - **Database name**: `kokoroe2`
   - **Owner**: `postgres`（デフォルト）
   - 「Save」をクリック

2. **コマンドラインから作成する場合**
   - スタートメニューから「SQL Shell (psql)」を起動
   - パスワードを入力（インストール時に設定したパスワード）
   - 以下のコマンドを実行：
   ```sql
   CREATE DATABASE kokoroe2;
   \q
   ```

### macOS/Linuxの場合

```bash
# PostgreSQLに接続（デフォルトユーザーはpostgres）
psql postgres

# データベースを作成
CREATE DATABASE kokoroe2;

# 接続を終了
\q
```

## ステップ3: 環境変数の設定

1. **プロジェクトルートに`.env`ファイルを作成**

   Windowsの場合（PowerShell）:
   ```powershell
   Copy-Item env.example .env
   ```

   macOS/Linuxの場合:
   ```bash
   cp env.example .env
   ```

2. **`.env`ファイルを編集**

   テキストエディタで`.env`ファイルを開き、`DATABASE_URL`を編集します：

   ```env
   DATABASE_URL="postgresql://postgres:あなたのパスワード@localhost:5432/kokoroe2?schema=public"
   ```

   **例**（パスワードが`postgres`の場合）:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kokoroe2?schema=public"
   ```

   **重要**: 
   - `postgres`はデフォルトのユーザー名です
   - パスワードはインストール時に設定したものを使用してください
   - ポート番号は通常`5432`です

## ステップ4: 依存関係のインストール

プロジェクトのルートディレクトリで以下のコマンドを実行：

```bash
npm install
```

これにより、以下のパッケージがインストールされます：
- Next.js 14
- React 18
- Prisma
- TypeScript
- その他の依存関係

**インストールに時間がかかる場合があります（数分程度）**

## ステップ5: Prismaクライアントの生成

```bash
npm run db:generate
```

このコマンドで、Prismaスキーマ（`prisma/schema.prisma`）からTypeScriptの型定義とPrismaクライアントが生成されます。

**成功すると以下のメッセージが表示されます：**
```
✔ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client
```

## ステップ6: データベースマイグレーション

```bash
npm run db:migrate
```

このコマンドで：
1. データベースにテーブルが作成されます
2. マイグレーションファイルが`prisma/migrations`に生成されます

**初回実行時は、マイグレーション名を聞かれます：**
```
? Enter a name for the new migration: ›
```

**推奨**: `init` または `initial_schema` と入力してEnter

**成功すると以下のようなメッセージが表示されます：**
```
✔ Migrations created at prisma/migrations/20240101000000_init
✔ Applied migration `20240101000000_init`
```

## ステップ7: シードデータの投入

```bash
npm run db:seed
```

このコマンドで、以下の初期データがデータベースに投入されます：
- 管理者アカウント（admin / admin）
- 評価項目（5項目）
- テストメンバー（チームA: 3名、チームB: 3名）

**成功すると以下のメッセージが表示されます：**
```
Seed data created successfully!
```

## ステップ8: 開発サーバーの起動

```bash
npm run dev
```

**成功すると以下のメッセージが表示されます：**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - ready started server on 0.0.0.0:3000
```

ブラウザで **http://localhost:3000** を開いてください。

## ステップ9: 動作確認

### ログイン確認

1. ブラウザで http://localhost:3000 を開く
2. ログイン画面が表示されることを確認
3. 以下のアカウントでログインを試す：
   - **管理者**: `admin` / `admin`
   - **ユーザー**: `user001` / `user001`

### 管理者機能の確認

1. 管理者でログイン
2. 以下のタブが表示されることを確認：
   - メンバー管理
   - 評価項目管理
   - 評価期間管理
   - 採点調整

### ユーザー機能の確認

1. ユーザー（user001）でログイン
2. 以下のタブが表示されることを確認：
   - 採点フォーム
   - 入力結果
   - 集計結果
   - 月次推移
   - 設定

## ステップ10: Prisma Studioの起動（オプション）

データベースを視覚的に確認・編集したい場合：

```bash
npm run db:studio
```

**別のターミナルウィンドウで実行してください**（開発サーバーとは別）

ブラウザで **http://localhost:5555** が自動的に開きます。

Prisma Studioでは：
- テーブルの一覧表示
- データの追加・編集・削除
- リレーションの確認
が可能です。

## トラブルシューティング

### エラー: "Can't reach database server"

**原因**: PostgreSQLが起動していない

**解決方法**:
- Windows: サービス管理でPostgreSQLサービスを起動
- macOS: `brew services start postgresql@16`
- Linux: `sudo systemctl start postgresql`

### エラー: "password authentication failed"

**原因**: `.env`ファイルのパスワードが間違っている

**解決方法**:
1. `.env`ファイルの`DATABASE_URL`のパスワードを確認
2. PostgreSQLのパスワードを確認（pgAdminで確認可能）

### エラー: "database does not exist"

**原因**: データベースが作成されていない

**解決方法**:
1. ステップ2を実行してデータベースを作成
2. `.env`ファイルのデータベース名を確認

### エラー: "relation does not exist"

**原因**: マイグレーションが実行されていない

**解決方法**:
```bash
npm run db:migrate
```

### ポート3000が既に使用されている

**原因**: 他のアプリケーションがポート3000を使用している

**解決方法**:
1. 他のアプリケーションを停止
2. または、`next.config.js`でポートを変更（推奨しない）

## 次のステップ

セットアップが完了したら、以下を試してみてください：

1. **管理者でログインしてメンバーを追加**
2. **ユーザーでログインして評価を入力**
3. **集計結果を確認**
4. **Prisma Studioでデータを確認**

## よく使うコマンド一覧

```bash
# 開発サーバー起動
npm run dev

# Prisma Studio起動
npm run db:studio

# データベースをリセット（全データ削除）
npx prisma migrate reset

# マイグレーション状態を確認
npx prisma migrate status

# Prismaクライアントを再生成
npm run db:generate
```

## サポート

問題が発生した場合は、以下を確認してください：

1. PostgreSQLが起動しているか
2. `.env`ファイルの`DATABASE_URL`が正しいか
3. データベース`kokoroe2`が作成されているか
4. マイグレーションが実行されているか
