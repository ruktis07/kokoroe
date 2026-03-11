# Git を一から作る手順

このプロジェクトで、新しく Git リポジトリを作り直して最初のコミットまで行う手順です。

---

## 前提

- ターミナル（PowerShell や CMD）を **プロジェクトのフォルダ**（`kokoroe`）で開いておく。
- 既存の `.git` を消して「本当に一から」やりたい場合だけ **手順 0** を実行する。

---

## 手順 0（任意）既存の Git をやめて新しくする

すでに `git init` したことがある場合は、次のどちらかで「Git の履歴だけ」消せる。

**PowerShell:**
```powershell
cd c:\Users\user\kokoroe
Remove-Item -Recurse -Force .git
```

**コマンドプロンプト (CMD):**
```cmd
cd c:\Users\user\kokoroe
rmdir /s /q .git
```

これでこのフォルダは「Git 管理されていない普通のフォルダ」になる。手順 1 から進める。

---

## 手順 1: リポジトリを新規作成

```powershell
cd c:\Users\user\kokoroe
git init
```

表示例: `Initialized empty Git repository in c:/Users/user/kokoroe/.git/`

---

## 手順 2: どのファイルがコミット対象か確認する

```powershell
git status
```

- **Untracked**: まだ Git が追跡していないファイル（ここから選んで add する）
- **Modified**: 追跡中で変更があるファイル
- `.gitignore` に書いてあるもの（`node_modules`, `.next`, `.env` など）は一覧に出てこない（無視される）

---

## 手順 3: 全部（または必要なものだけ）をステージする

**全部追加する場合:**
```powershell
git add .
```

**特定のファイルだけ追加する場合（例）:**
```powershell
git add .gitignore
git add .env.example
git add DEPLOYMENT.md
git add vercel.json
git add package.json
git add package-lock.json
git add prisma/
git add app/
git add components/
git add lib/
git add public/
# 必要なフォルダ・ファイルを続けて追加
```

---

## 手順 4: ステージした内容を確認する

```powershell
git status
```

緑色（または "Changes to be committed"）になっているものが、このあとコミットされる内容。

---

## 手順 5: 最初のコミットを作る

```powershell
git commit -m "Initial commit: Next.js + Prisma, Vercel/Supabase 対応"
```

`main` や `master` といった「現在のブランチ」に、1 つ目のコミットが作られる。

---

## 手順 6（任意）リモートに上げる（GitHub など）

### 6-1. GitHub で新規リポジトリを作る

1. [GitHub](https://github.com) にログイン
2. **New repository**
3. リポジトリ名（例: `kokoroe`）、Public/Private を選ぶ
4. **Create repository** だけ押す（README や .gitignore は追加しない）

### 6-2. リモートを追加してプッシュする

GitHub に表示される「リポジトリの URL」を使って、次を実行する（`YOUR_USERNAME` と `kokoroe` は自分のユーザー名・リポジトリ名に置き換える）。

**HTTPS の例:**
```powershell
git remote add origin https://github.com/YOUR_USERNAME/kokoroe.git
git branch -M main
git push -u origin main
```

**SSH の例:**
```powershell
git remote add origin git@github.com:YOUR_USERNAME/kokoroe.git
git branch -M main
git push -u origin main
```

初回 `git push` で GitHub にコードがアップロードされる。

---

## 注意しておくとよいこと

- **`.env`** は `.gitignore` に入っているので、コミットされない（パスワードなどが GitHub に上がらない）。
- **`.env.example`** はコミットしてよい（本物の値は書かず、項目名だけの例）。
- **`node_modules`** と **`.next`** も無視されるので、リポジトリが軽いままになる。
- `prisma/migrations` もいまは無視されている。マイグレーションも Git で管理したい場合は、`.gitignore` の `/prisma/migrations` の行を削除してから `git add` し直す。

ここまでで「Git を新しく作って、一から最初のコミットまで」の流れは完了です。
