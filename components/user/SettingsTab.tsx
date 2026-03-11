'use client'

import { useState } from 'react'

export default function SettingsTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== newPasswordConfirm) {
      alert('新しいパスワードが一致しません')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      if (response.ok) {
        alert('パスワードを変更しました')
        setCurrentPassword('')
        setNewPassword('')
        setNewPasswordConfirm('')
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
        <i className="fas fa-cog mr-2"></i>設定
      </h2>

      {/* パスワード変更セクション */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 text-blue-600">
          <i className="fas fa-key mr-2"></i>パスワード変更
        </h3>
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          <div>
            <label className="form-label">現在のパスワード</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">新しいパスワード</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={4}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">新しいパスワード（確認）</label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              minLength={4}
              className="form-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>変更中...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>パスワードを変更
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
