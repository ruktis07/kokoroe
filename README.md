# 心得入力 - チーム評価システム

社内のメンバーをチーム分けして、チーム内のメンバーを10段階評価で相互評価するWebアプリケーションです。

## プロジェクト概要

- **名称**: 心得入力
- **目的**: チーム内メンバーの相互評価による人材育成・チームワーク向上
- **主要機能**:
  - 管理者によるメンバー管理・評価項目管理
  - 使用者による10段階評価入力
  - チーム別の評価集計・可視化

## 完成済み機能

### 管理者機能（admin/admin でログイン、チーム所属なし）
- ✅ メンバー管理（登録、削除、チーム変更：A～J の10チーム）
- ✅ 評価項目管理（大項目・中項目・説明の構造）
  - 登録、削除、編集、表示順設定
  - 編集モードでリアルタイム変更
- ✅ 採点調整フォーム（使用者の入力した評価点を管理者が調整可能）

### 使用者機能（登録されたユーザー名でログイン）
- ✅ 採点フォーム（チームメンバーを各項目で1～10点評価）
  - 一括保存機能（全員分まとめて保存）
  - 大項目・中項目・説明を表示
- ✅ 入力結果表示（自分が入力した評価の一覧）
- ✅ 集計結果表示（チーム内メンバーの平均評価点）

### 認証機能
- ✅ 管理者ログイン（ID: admin / パスワード: admin）
- ✅ 使用者ログイン（ユーザー名のみ）
- ✅ セッション管理

## 公開URL

- **開発環境**: https://3000-ie6uucrc6o6wm1kx2p7lo-5c13a017.sandbox.novita.ai
- **本番環境**: （Cloudflare Pagesにデプロイ後に追加）

## 機能URIサマリー

### 認証API
- `POST /api/login` - ログイン（管理者/使用者）
- `POST /api/logout` - ログアウト
- `GET /api/me` - 現在のユーザー情報取得

### メンバー管理API（管理者専用）
- `GET /api/members` - メンバー一覧取得
- `POST /api/members` - メンバー追加（body: username, name, team）
- `PUT /api/members/:id` - メンバー更新（body: name, team）
- `DELETE /api/members/:id` - メンバー削除

### 評価項目管理API
- `GET /api/items` - 評価項目一覧取得（全ユーザー）
- `POST /api/items` - 評価項目追加（管理者専用、body: major_category, minor_category, description, display_order）
- `PUT /api/items/:id` - 評価項目更新（管理者専用、body: major_category, minor_category, description, display_order）
- `DELETE /api/items/:id` - 評価項目削除（管理者専用）

### 評価データAPI
- `GET /api/team-members` - 自チームのメンバー取得（自分以外）
- `POST /api/evaluations` - 評価保存/更新（body: evaluated_id, item_id, score）
- `POST /api/evaluations/bulk` - 評価一括保存（body: evaluations配列）
- `GET /api/evaluations/my` - 自分の入力した評価一覧
- `GET /api/evaluations/summary` - チーム別集計結果

### 管理者専用：採点調整API
- `GET /api/admin/evaluations` - 全評価データ取得
- `PUT /api/admin/evaluations/:id` - 評価点数更新（body: score）

## データ構造

### データモデル

#### members（メンバー）
- `id`: メンバーID（主キー）
- `username`: ユーザー名（ユニーク）
- `name`: 氏名
- `team`: チーム（A～J）
- `role`: 役割（admin/user）
- `password`: パスワード（管理者のみ）

#### evaluation_items（評価項目）
- `id`: 項目ID（主キー）
- `major_category`: 大項目
- `minor_category`: 中項目
- `name`: 表示名（大項目 - 中項目の形式）
- `description`: 説明
- `display_order`: 表示順

#### evaluations（評価データ）
- `id`: 評価ID（主キー）
- `evaluator_id`: 評価者ID
- `evaluated_id`: 被評価者ID
- `item_id`: 評価項目ID
- `score`: 点数（1～10）
- `created_at`: 作成日時
- `updated_at`: 更新日時

### ストレージサービス
- **Cloudflare D1 Database**: SQLiteベースの分散データベース
  - ローカル開発: `--local` フラグで自動的にローカルSQLite使用
  - 本番環境: グローバル分散D1データベース

## 使用方法

### 管理者の使い方
1. ユーザー名「admin」、パスワード「admin」でログイン
2. **メンバー管理**: 評価対象メンバーを登録・チーム割り当て
3. **評価項目管理**: 評価に使用する項目を登録・編集
4. **採点調整**: 使用者が入力した評価点を確認・調整可能

### 使用者の使い方
1. 管理者に登録されたユーザー名でログイン
2. **採点フォーム**: 
   - 自チームのメンバーを各項目で1～10点評価
   - 全て入力したら「全て保存」ボタンで一括保存
3. **入力結果**: 自分が入力した評価内容を確認
4. **集計結果**: チーム内メンバーの平均評価点を確認

### テストデータ
初期状態で以下のテストデータが登録されています：
- **評価項目**: 
  - ビジネススキル（コミュニケーション、業務遂行、チームワーク、問題解決）
  - テクニカルスキル（専門性）
- **チームA**: 田中太郎、佐藤花子、鈴木一郎
- **チームB**: 高橋美咲、伊藤健太、渡辺由美

## デプロイ状況

- **プラットフォーム**: Cloudflare Pages + Cloudflare D1
- **開発環境ステータス**: ✅ Active
- **本番環境ステータス**: 準備完了（デプロイ待ち）
- **技術スタック**: Hono + TypeScript + TailwindCSS + Cloudflare D1
- **最終更新日**: 2025-10-24

## 技術仕様

### フロントエンド
- TailwindCSS（CDN）
- Font Awesome（アイコン）
- Axios（HTTP通信）
- バニラJavaScript（SPA実装）

### バックエンド
- Hono（Web Framework）
- TypeScript
- Cloudflare Workers

### データベース
- Cloudflare D1（SQLite互換）
- マイグレーション管理

### 無料プラン対応
- Cloudflare Pages: 無料（月500ビルド、無制限リクエスト）
- Cloudflare D1: 無料枠（5GB storage、5百万read、10万write/日）
- 外部サービス不要のシンプルな認証

## 開発コマンド

```bash
# ローカル開発サーバー起動
npm run dev:sandbox

# ビルド
npm run build

# データベースマイグレーション（ローカル）
npm run db:migrate:local

# テストデータ投入
npm run db:seed

# データベースリセット
npm run db:reset

# 本番デプロイ
npm run deploy:prod
```

## 今後の拡張案

- [ ] メンバーのパスワード設定機能
- [ ] 評価期間の設定機能（評価の締め切り管理）
- [ ] 評価結果のCSVエクスポート機能
- [ ] グラフによる可視化（レーダーチャート等）
- [ ] 過去の評価履歴管理
- [ ] 自己評価機能の追加
- [ ] 評価コメント機能
- [ ] メール通知機能
