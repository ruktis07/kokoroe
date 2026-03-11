'use client'

import { useState } from 'react'

interface User {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

interface LoginScreenProps {
  onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        onLogin(data.user)
      } else {
        setError(data.error || 'ログインに失敗しました')
      }
    } catch (error) {
      setError('ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4 py-6">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <i className="fas fa-users text-4xl sm:text-5xl text-blue-500 mb-3 sm:mb-4"></i>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">心得</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">心得評価システム</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-user mr-2"></i>ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-lock mr-2"></i>パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 touch-manipulation min-h-[48px]"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>ログイン中...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>ログイン
              </>
            )}
          </button>
        </form>

        {/* <div className="mt-6 text-center text-sm text-gray-600">
          <p>管理者: admin / admin</p>
          <p>使用者: ユーザー名 / ユーザー名（初期パスワード）</p>
        </div> */}
      </div>
    </div>
  )
}
