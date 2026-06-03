import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface SessionUser {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

// アイドルタイムアウト（最後の操作からこの時間を超えると自動ログアウト）
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30分

/**
 * セッション Cookie からユーザー ID を読み取り、その時点での最新のユーザー情報を
 * DB から取得して返す。チーム異動やロール変更が即時に反映されるようにするためで、
 * Cookie にキャッシュされた team / role を信用しない設計に変更している。
 *
 * あわせて、Cookie 内の最終操作時刻(ts)で 30 分のアイドルタイムアウトを判定し、
 * 認証が通るたびに ts を更新する（スライディングウィンドウ方式）。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_user')

  if (!sessionCookie) {
    return null
  }

  let storedId: number | null = null
  let storedTs: number | null = null
  try {
    const stored = JSON.parse(sessionCookie.value) as { id?: number; ts?: number }
    if (typeof stored.id === 'number') {
      storedId = stored.id
    }
    if (typeof stored.ts === 'number') {
      storedTs = stored.ts
    }
  } catch {
    return null
  }

  if (storedId == null) {
    return null
  }

  // アイドルタイムアウト判定（最後の操作から 30 分を超えていたら無効）
  const now = Date.now()
  if (storedTs != null && now - storedTs > IDLE_TIMEOUT_MS) {
    try {
      cookieStore.delete('session_user')
    } catch {
      // Cookie 削除不可のコンテキストでは無視
    }
    return null
  }

  const fresh = await prisma.member.findUnique({
    where: { id: storedId },
    select: {
      id: true,
      username: true,
      name: true,
      team: true,
      role: true,
    },
  })

  if (!fresh) {
    return null
  }

  // 最終操作時刻を更新（セッション Cookie のまま＝ブラウザを閉じると破棄）
  try {
    cookieStore.set('session_user', JSON.stringify({ id: storedId, ts: now }), {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    })
  } catch {
    // Server Component など Cookie 書き込み不可のコンテキストでは無視
  }

  return fresh as SessionUser
}

export async function setSessionUser(user: SessionUser) {
  const cookieStore = await cookies()
  // maxAge / expires を指定しないことで「セッションCookie」になり、
  // ブラウザを閉じたタイミングで破棄される（＝自動ログアウト）。
  // ts に最終操作時刻を入れ、アイドルタイムアウト判定に使う。
  cookieStore.set('session_user', JSON.stringify({ id: user.id, ts: Date.now() }), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  })
}

export async function deleteSessionUser() {
  const cookieStore = await cookies()
  cookieStore.delete('session_user')
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('認証が必要です')
  }
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== 'admin') {
    throw new Error('管理者権限が必要です')
  }
  return user
}
