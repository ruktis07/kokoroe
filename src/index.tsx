import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database;
}

type Member = {
  id: number;
  username: string;
  name: string;
  team: string;
  role: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定（Cookie送信を許可）
app.use('/api/*', cors({
  origin: (origin) => origin,
  credentials: true
}))

// セッション管理用ミドルウェア
const requireAuth = async (c: any, next: any) => {
  const sessionUser = getCookie(c, 'session_user')
  if (!sessionUser) {
    return c.json({ error: '認証が必要です' }, 401)
  }
  c.set('currentUser', JSON.parse(sessionUser))
  await next()
}

const requireAdmin = async (c: any, next: any) => {
  const sessionUser = getCookie(c, 'session_user')
  if (!sessionUser) {
    return c.json({ error: '認証が必要です' }, 401)
  }
  const user = JSON.parse(sessionUser)
  if (user.role !== 'admin') {
    return c.json({ error: '管理者権限が必要です' }, 403)
  }
  c.set('currentUser', user)
  await next()
}

// ==================== 認証API ====================

// ログイン
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()
  
  if (!username) {
    return c.json({ error: 'ユーザー名を入力してください' }, 400)
  }

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM members WHERE username = ?'
  ).bind(username).all()

  if (results.length === 0) {
    return c.json({ error: 'ユーザーが見つかりません' }, 404)
  }

  const user = results[0] as Member

  // 管理者の場合はパスワードチェック
  if (user.role === 'admin') {
    if (password !== 'admin') {
      return c.json({ error: 'パスワードが正しくありません' }, 401)
    }
  }

  // セッション設定
  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
    team: user.team,
    role: user.role
  })
  
  setCookie(c, 'session_user', sessionData, {
    maxAge: 86400, // 24時間
    path: '/',
    sameSite: 'Lax'
  })

  return c.json({ 
    success: true, 
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      team: user.team,
      role: user.role
    }
  })
})

// ログアウト
app.post('/api/logout', (c) => {
  deleteCookie(c, 'session_user')
  return c.json({ success: true })
})

// 現在のユーザー情報取得
app.get('/api/me', requireAuth, (c) => {
  const currentUser = c.get('currentUser')
  return c.json({ user: currentUser })
})

// ==================== メンバー管理API（管理者専用） ====================

// メンバー一覧取得
app.get('/api/members', requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, username, name, team, role, created_at FROM members ORDER BY team, name'
  ).all()
  
  return c.json({ members: results })
})

// メンバー追加
app.post('/api/members', requireAdmin, async (c) => {
  const { username, name, team } = await c.req.json()
  
  if (!username || !name || !team) {
    return c.json({ error: '必須項目を入力してください' }, 400)
  }

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO members (username, name, team, role) VALUES (?, ?, ?, ?)'
    ).bind(username, name, team, 'user').run()

    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      return c.json({ error: 'このユーザー名は既に使用されています' }, 400)
    }
    return c.json({ error: 'メンバーの追加に失敗しました' }, 500)
  }
})

// メンバー削除
app.delete('/api/members/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  
  // 管理者自身は削除できない
  if (id === '1') {
    return c.json({ error: '管理者アカウントは削除できません' }, 400)
  }

  await c.env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// メンバー更新
app.put('/api/members/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { name, team } = await c.req.json()
  
  await c.env.DB.prepare(
    'UPDATE members SET name = ?, team = ? WHERE id = ?'
  ).bind(name, team, id).run()

  return c.json({ success: true })
})

// ==================== 評価項目管理API（管理者専用） ====================

// 評価項目一覧取得
app.get('/api/items', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM evaluation_items ORDER BY display_order, id'
  ).all()
  
  return c.json({ items: results })
})

// 評価項目追加
app.post('/api/items', requireAdmin, async (c) => {
  const { major_category, minor_category, description, display_order } = await c.req.json()
  
  if (!major_category || !minor_category) {
    return c.json({ error: '大項目と中項目を入力してください' }, 400)
  }

  const name = `${major_category} - ${minor_category}`
  const result = await c.env.DB.prepare(
    'INSERT INTO evaluation_items (major_category, minor_category, name, description, display_order) VALUES (?, ?, ?, ?, ?)'
  ).bind(major_category, minor_category, name, description || '', display_order || 999).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

// 評価項目更新
app.put('/api/items/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { major_category, minor_category, description, display_order } = await c.req.json()
  
  const name = `${major_category} - ${minor_category}`
  await c.env.DB.prepare(
    'UPDATE evaluation_items SET major_category = ?, minor_category = ?, name = ?, description = ?, display_order = ? WHERE id = ?'
  ).bind(major_category, minor_category, name, description, display_order, id).run()

  return c.json({ success: true })
})

// 評価項目削除
app.delete('/api/items/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  
  await c.env.DB.prepare('DELETE FROM evaluation_items WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ==================== 評価データ管理API ====================

// 自分の評価データ取得
app.get('/api/evaluations/my', requireAuth, async (c) => {
  const currentUser = c.get('currentUser')
  
  const { results } = await c.env.DB.prepare(`
    SELECT e.*, 
           m.name as evaluated_name,
           i.name as item_name
    FROM evaluations e
    JOIN members m ON e.evaluated_id = m.id
    JOIN evaluation_items i ON e.item_id = i.id
    WHERE e.evaluator_id = ?
    ORDER BY m.name, i.display_order
  `).bind(currentUser.id).all()
  
  return c.json({ evaluations: results })
})

// チームメンバー取得（自分以外）
app.get('/api/team-members', requireAuth, async (c) => {
  const currentUser = c.get('currentUser')
  
  const { results } = await c.env.DB.prepare(
    'SELECT id, username, name, team FROM members WHERE team = ? AND id != ? ORDER BY name'
  ).bind(currentUser.team, currentUser.id).all()
  
  return c.json({ members: results })
})

// 評価データ保存/更新
app.post('/api/evaluations', requireAuth, async (c) => {
  const currentUser = c.get('currentUser')
  const { evaluated_id, item_id, score } = await c.req.json()
  
  if (!evaluated_id || !item_id || !score) {
    return c.json({ error: '必須項目が不足しています' }, 400)
  }

  if (score < 1 || score > 10) {
    return c.json({ error: '評価は1～10の範囲で入力してください' }, 400)
  }

  // 自分自身の評価は不可
  if (evaluated_id === currentUser.id) {
    return c.json({ error: '自分自身を評価することはできません' }, 400)
  }

  await c.env.DB.prepare(`
    INSERT INTO evaluations (evaluator_id, evaluated_id, item_id, score, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(evaluator_id, evaluated_id, item_id) 
    DO UPDATE SET score = ?, updated_at = CURRENT_TIMESTAMP
  `).bind(currentUser.id, evaluated_id, item_id, score, score).run()

  return c.json({ success: true })
})

// 評価データ一括保存
app.post('/api/evaluations/bulk', requireAuth, async (c) => {
  const currentUser = c.get('currentUser')
  const { evaluations } = await c.req.json()
  
  if (!evaluations || !Array.isArray(evaluations)) {
    return c.json({ error: '評価データが不正です' }, 400)
  }

  // トランザクション風に複数のINSERTを実行
  for (const evaluation of evaluations) {
    const { evaluated_id, item_id, score } = evaluation
    
    if (!evaluated_id || !item_id || !score) continue
    if (score < 1 || score > 10) continue
    if (evaluated_id === currentUser.id) continue

    await c.env.DB.prepare(`
      INSERT INTO evaluations (evaluator_id, evaluated_id, item_id, score, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(evaluator_id, evaluated_id, item_id) 
      DO UPDATE SET score = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(currentUser.id, evaluated_id, item_id, score, score).run()
  }

  return c.json({ success: true, count: evaluations.length })
})

// 集計結果取得（チーム別）
app.get('/api/evaluations/summary', requireAuth, async (c) => {
  const currentUser = c.get('currentUser')
  
  const { results } = await c.env.DB.prepare(`
    SELECT 
      m.id,
      m.name,
      i.id as item_id,
      i.name as item_name,
      AVG(e.score) as avg_score,
      COUNT(e.score) as count
    FROM members m
    LEFT JOIN evaluations e ON m.id = e.evaluated_id
    LEFT JOIN evaluation_items i ON e.item_id = i.id
    WHERE m.team = ? AND m.role = 'user'
    GROUP BY m.id, m.name, i.id, i.name
    ORDER BY m.name, i.display_order
  `).bind(currentUser.team).all()
  
  return c.json({ summary: results })
})

// ==================== 管理者：採点調整API ====================

// 全評価データ取得（管理者専用）
app.get('/api/admin/evaluations', requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT 
      e.*,
      evaluator.name as evaluator_name,
      evaluated.name as evaluated_name,
      evaluated.team as evaluated_team,
      i.name as item_name
    FROM evaluations e
    JOIN members evaluator ON e.evaluator_id = evaluator.id
    JOIN members evaluated ON e.evaluated_id = evaluated.id
    JOIN evaluation_items i ON e.item_id = i.id
    ORDER BY evaluated.team, evaluated.name, i.display_order
  `).all()
  
  return c.json({ evaluations: results })
})

// 評価データ更新（管理者専用）
app.put('/api/admin/evaluations/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { score } = await c.req.json()
  
  if (score < 1 || score > 10) {
    return c.json({ error: '評価は1～10の範囲で入力してください' }, 400)
  }

  await c.env.DB.prepare(
    'UPDATE evaluations SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(score, id).run()

  return c.json({ success: true })
})

// ==================== フロントエンド ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>心得入力 - チーム評価システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
