import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export interface SessionUser {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionUser = cookieStore.get('session_user')
  
  if (!sessionUser) {
    return null
  }
  
  try {
    return JSON.parse(sessionUser.value) as SessionUser
  } catch {
    return null
  }
}

export async function setSessionUser(user: SessionUser) {
  const cookieStore = await cookies()
  cookieStore.set('session_user', JSON.stringify(user), {
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
