import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface SessionUser {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

/**
 * セッション Cookie からユーザー ID を読み取り、その時点での最新のユーザー情報を
 * DB から取得して返す。チーム異動やロール変更が即時に反映されるようにするためで、
 * Cookie にキャッシュされた team / role を信用しない設計に変更している。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_user')

  if (!sessionCookie) {
    return null
  }

  let storedId: number | null = null
  try {
    const stored = JSON.parse(sessionCookie.value) as Partial<SessionUser>
    if (typeof stored.id === 'number') {
      storedId = stored.id
    }
  } catch {
    return null
  }

  if (storedId == null) {
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

  return fresh as SessionUser
}

export async function setSessionUser(user: SessionUser) {
  const cookieStore = await cookies()
  cookieStore.set('session_user', JSON.stringify({ id: user.id }), {
    maxAge: 86400, // 24 hours
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
