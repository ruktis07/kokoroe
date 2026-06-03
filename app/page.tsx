'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const LoginScreen = dynamic(() => import('@/components/LoginScreen'))
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'))
const UserDashboard = dynamic(() => import('@/components/UserDashboard'))

interface User {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  // アイドルタイムアウト: 最後の操作から30分間なにも操作がなければ自動ログアウト
  useEffect(() => {
    if (!currentUser) return
    const IDLE_MS = 30 * 60 * 1000 // 30分
    let timer: ReturnType<typeof setTimeout>
    const handleIdleLogout = () => {
      alert('一定時間操作がなかったため、自動的にログアウトしました。')
      handleLogout()
    }
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(handleIdleLogout, IDLE_MS)
    }
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((e) => window.addEventListener(e, reset, true))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset, true))
    }
  }, [currentUser])

  async function checkAuth() {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(user: User) {
    setCurrentUser(user)
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
    setCurrentUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
          <p className="mt-4 text-gray-700">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />
  }

  return <UserDashboard user={currentUser} onLogout={handleLogout} />
}
