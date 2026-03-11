# Windows環境での詳細セットアップ手順

このガイドは、Windows環境でのセットアップをより詳しく説明します。

## 前提条件

- Node.js 18以上がインストールされていること
- npmが使用可能であること

Node.jsのインストール確認：
```powershell
node --version
npm --version
```

## ステップ1: PostgreSQLのインストール（Windows）

### 1-1. PostgreSQLのダウンロード

1. ブラウザで https://www.postgresql.org/download/windows/ を開く
2. 「Download the installer」セクションの「Download」ボタンをクリック
3. 「EnterpriseDB」のサイトに移動します
4. 最新版（例: PostgreSQL 16.x）を選択
5. Windows x86-64版をダウンロード（ファイルサイズ: 約200MB）

### 1-2. PostgreSQLのインストール

1. ダウンロードした`.exe`ファイルを実行
2. セットアップウィザードが起動します
3. 以下の設定を行います：

   **インストールディレクトリ**:
   - デフォルト: `C:\Program Files\PostgreSQL\16`
   - そのままでOK

   **コンポーネント選択**:
   - ✅ PostgreSQL Server（必須）
   - ✅ pgAdmin 4（推奨：GUIツール）
   - ✅ Stack Builder（オプション）
   - ✅ Command Line Tools（推奨）

   **データディレクトリ**:
   - デフォルト: `C:\Program Files\PostgreSQL\16\data`
   - そのままでOK

   **パスワード設定**:
   - **重要**: 後で使うので必ず覚えておく
   - 例: `postgres`（開発環境の場合）
   - 本番環境では強力なパスワードを設定

   **ポート番号**:
   - デフォルト: `5432`
   - そのままでOK

   **ロケール**:
   - デフォルト: `[Default locale]`
   - そのままでOK

4. 「Next」をクリックしてインストールを開始
5. インストール完了後、「Finish」をクリック

### 1-3. PostgreSQLサービスの確認

1. Windowsキーを押して「サービス」と入力
2. 「サービス」アプリを開く
3. リストから「postgresql-x64-16」を探す
4. 状態が「実行中」になっていることを確認
5. もし「停止」になっていたら、右クリック → 「開始」

## ステップ2: データベースの作成

### 方法1: pgAdminを使用（推奨）

1. **pgAdmin 4を起動**
   - スタートメニューから「pgAdmin 4」を検索して起動
   - 初回起動時はマスターパスワードの設定を求められます（任意）

2. **サーバーに接続**
   - 左側のツリーで「Servers」を展開
   - 「PostgreSQL 16」を展開
   - パスワードを入力（インストール時に設定したパスワード）

3. **データベースを作成**
   - 「Databases」を右クリック
   - 「Create」 → 「Database...」を選択
   - **General**タブ:
     - **Database**: `kokoroe2`
   - **Owner**: `postgres`（デフォルト）
   - 「Save」をクリック

4. **作成確認**
   - 左側のツリーで「Databases」を展開
   - `kokoroe2`が表示されていれば成功

### 方法2: コマンドラインを使用

1. **SQL Shell (psql)を起動**
   - スタートメニューから「SQL Shell (psql)」を検索して起動

2. **接続情報を入力**
   ```
   Server [localhost]: （Enterキーを押す）
   Database [postgres]: （Enterキーを押す）
   Port [5432]: （Enterキーを押す）
   Username [postgres]: （Enterキーを押す）
   Password for user postgres: （パスワードを入力してEnter）
   ```

3. **データベースを作成**
   ```sql
   CREATE DATABASE kokoroe2;
   ```

4. **確認**
   ```sql
   \l
   ```
   `kokoroe2`がリストに表示されていれば成功

5. **終了**
   ```sql
   \q
   ```

## ステップ3: 環境変数の設定

### 3-1. .envファイルの作成

1. **プロジェクトディレクトリを開く**
   - エクスプローラーで`C:\Users\user\kokoroe2`を開く

2. **env.exampleファイルをコピー**
   - `env.example`ファイルを右クリック
   - 「コピー」を選択
   - 同じフォルダ内で右クリック → 「貼り付け」
   - ファイル名を`.env`に変更
   - 警告が出たら「はい」をクリック

   **または、PowerShellで実行**:
   ```powershell
   cd C:\Users\user\kokoroe2
   Copy-Item env.example .env
   ```

### 3-2. .envファイルの編集

1. **テキストエディタで開く**
   - `.env`ファイルを右クリック
   - 「プログラムから開く」 → 「メモ帳」を選択
   - または、Visual Studio Code、Notepad++など

2. **DATABASE_URLを編集**
   ```env
   DATABASE_URL="postgresql://postgres:あなたのパスワード@localhost:5432/kokoroe2?schema=public"
   ```

   **例**（パスワードが`postgres`の場合）:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kokoroe2?schema=public"
   ```

   **重要**: 
   - `postgres`はデフォルトのユーザー名
   - パスワード部分は、PostgreSQLインストール時に設定したパスワード
   - パスワードに特殊文字（`@`、`:`など）が含まれる場合は、URLエンコードが必要

3. **ファイルを保存**
   - Ctrl + S で保存

## ステップ4: 依存関係のインストール

1. **PowerShellまたはコマンドプロンプトを開く**
   - プロジェクトディレクトリで右クリック → 「ターミナルで開く」
   - または、PowerShellを開いて以下を実行：
   ```powershell
   cd C:\Users\user\kokoroe2
   ```

2. **npm installを実行**
   ```powershell
   npm install
   ```

   **実行時間**: 2-5分程度

   **成功すると以下のようなメッセージが表示されます**:
   ```
   added 500 packages, and audited 501 packages in 2m
   ```

   **エラーが出た場合**:
   - Node.jsのバージョンを確認: `node --version`（18以上推奨）
   - インターネット接続を確認
   - 管理者権限で実行してみる

## ステップ5: Prismaクライアントの生成

```powershell
npm run db:generate
```

**成功すると**:
```
✔ Generated Prisma Client (5.19.0) to ./node_modules/@prisma/client
```

**エラーが出た場合**:
- `.env`ファイルの`DATABASE_URL`が正しいか確認
- PostgreSQLが起動しているか確認

## ステップ6: データベースマイグレーション

```powershell
npm run db:migrate
```

**初回実行時**:
```
? Enter a name for the new migration: ›
```

**推奨**: `init` と入力してEnter

**成功すると**:
```
✔ Migrations created at prisma/migrations/20240101000000_init
✔ Applied migration `20240101000000_init`
```

**エラーが出た場合**:
- データベース`kokoroe2`が作成されているか確認
- `.env`ファイルのパスワードが正しいか確認
- PostgreSQLサービスが起動しているか確認

## ステップ7: シードデータの投入

```powershell
npm run db:seed
```

**成功すると**:
```
Seed data created successfully!
```

**エラーが出た場合**:
- マイグレーションが実行されているか確認（ステップ6）
- データベース接続を確認

## ステップ8: 開発サーバーの起動

```powershell
npm run dev
```

**成功すると**:
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000

  ✓ Ready in 2.5s
```

**ブラウザで開く**:
- 自動的に開かない場合は、手動で http://localhost:3000 を開く

**エラーが出た場合**:
- ポート3000が使用中でないか確認
- 他のターミナルで`npm run dev`が実行されていないか確認

## ステップ9: 動作確認

### 9-1. ログイン画面の確認

1. ブラウザで http://localhost:3000 を開く
2. ログイン画面が表示されることを確認
3. 以下のアカウントでログインを試す：

   **管理者アカウント**:
   - ユーザー名: `admin`
   - パスワード: `admin`

   **ユーザーアカウント**:
   - ユーザー名: `user001`
   - パスワード: `user001`

### 9-2. 管理者機能の確認

1. 管理者でログイン
2. 上部にタブが表示されることを確認：
   - ✅ メンバー管理
   - ✅ 評価項目管理
   - ✅ 評価期間管理
   - ✅ 採点調整

3. **メンバー管理タブ**:
   - チームA、チームBにメンバーが表示される
   - 「メンバー追加」フォームが表示される

4. **評価項目管理タブ**:
   - 5つの評価項目が表示される
   - 「評価項目追加」フォームが表示される

### 9-3. ユーザー機能の確認

1. ログアウトして、ユーザー（user001）でログイン
2. 上部にタブが表示されることを確認：
   - ✅ 採点フォーム
   - ✅ 入力結果
   - ✅ 集計結果
   - ✅ 月次推移
   - ✅ 設定

3. **採点フォームタブ**:
   - チームメンバーの評価表が表示される
   - 入力フィールドが表示される

## ステップ10: Prisma Studioの起動（オプション）

**新しいPowerShellウィンドウを開く**（開発サーバーとは別）

```powershell
cd C:\Users\user\kokoroe2
npm run db:studio
```

**成功すると**:
```
Prisma Studio is up on http://localhost:5555
```

ブラウザで http://localhost:5555 が自動的に開きます。

**Prisma Studioでできること**:
- テーブルの一覧表示
- データの追加・編集・削除
- リレーションの確認
- データの検索・フィルタ

## よくあるエラーと解決方法

### エラー1: "Can't reach database server"

**原因**: PostgreSQLサービスが起動していない

**解決方法**:
1. Windowsキーを押して「サービス」と入力
2. 「サービス」アプリを開く
3. 「postgresql-x64-16」を探す
4. 右クリック → 「開始」

### エラー2: "password authentication failed"

**原因**: `.env`ファイルのパスワードが間違っている

**解決方法**:
1. `.env`ファイルを開く
2. `DATABASE_URL`のパスワード部分を確認
3. PostgreSQLのパスワードを確認（pgAdminで確認可能）

### エラー3: "database does not exist"

**原因**: データベースが作成されていない

**解決方法**:
1. pgAdminを開く
2. 「Databases」を右クリック → 「Create」 → 「Database...」
3. データベース名: `kokoroe2`
4. 「Save」をクリック

### エラー4: "relation does not exist"

**原因**: マイグレーションが実行されていない

**解決方法**:
```powershell
npm run db:migrate
```

### エラー5: ポート3000が既に使用されている

**原因**: 他のアプリケーションがポート3000を使用している

**解決方法**:
1. 他のターミナルで`npm run dev`が実行されていないか確認
2. 実行されていたら、Ctrl + C で停止
3. それでもエラーが出る場合は、他のアプリケーションを確認

## 次のステップ

セットアップが完了したら、以下を試してみてください：

1. **管理者でログインしてメンバーを追加**
   - メンバー管理タブ → 新しいメンバーを追加

2. **ユーザーでログインして評価を入力**
   - 採点フォームタブ → 評価を入力 → 「全て保存」

3. **集計結果を確認**
   - 集計結果タブ → 評価結果を確認

4. **Prisma Studioでデータを確認**
   - Prisma Studio → テーブルを確認

## 開発のヒント

### データベースをリセットしたい場合

```powershell
npx prisma migrate reset
```

これで、データベースがリセットされ、マイグレーションとシードデータが再実行されます。

### マイグレーション状態を確認

```powershell
npx prisma migrate status
```

### Prismaクライアントを再生成

```powershell
npm run db:generate
```

スキーマを変更した後は、必ず実行してください。

## サポート

問題が解決しない場合は、以下を確認してください：

1. ✅ PostgreSQLが起動しているか
2. ✅ `.env`ファイルの`DATABASE_URL`が正しいか
3. ✅ データベース`kokoroe2`が作成されているか
4. ✅ マイグレーションが実行されているか
5. ✅ Node.jsのバージョンが18以上か
