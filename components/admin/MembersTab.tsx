'use client'

import { useState, useEffect } from 'react'

interface Member {
  id: number
  username: string
  name: string
  team: string | null
  role: string
  passwordResetRequestedAt: string | null
}

export default function MembersTab() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  // '' は未配属（team=null）を表す
  const [newTeam, setNewTeam] = useState('A')
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: number; name: string } | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')

  const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    try {
      const response = await fetch('/api/members', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
      }
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          team: newTeam === '' ? null : newTeam,
        }),
      })
      if (response.ok) {
        alert('メンバーを追加しました')
        setNewUsername('')
        setNewName('')
        setNewTeam('A')
        loadMembers()
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  function startEditName(member: Member) {
    setEditingMemberId(member.id)
    setEditingName(member.name)
  }

  function cancelEditName() {
    setEditingMemberId(null)
    setEditingName('')
  }

  async function saveEditName(id: number, newName: string, currentTeam: string | null) {
    if (!newName.trim()) {
      alert('名前を入力してください')
      return
    }
    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim(), team: currentTeam }),
      })
      if (response.ok) {
        alert('名前を更新しました')
        setEditingMemberId(null)
        setEditingName('')
        loadMembers()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  async function handleUpdateTeam(id: number, name: string, newTeamRaw: string) {
    const newTeam = newTeamRaw === '' ? null : newTeamRaw
    const destLabel = newTeam === null ? '未配属' : `チーム${newTeam}`
    if (!confirm(`${name}さんを${destLabel}に移動しますか？`)) return
    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, team: newTeam }),
      })
      if (response.ok) {
        alert(`${name}さんを${destLabel}に移動しました`)
        loadMembers()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  async function handleDeleteMember(id: number) {
    if (!confirm('このメンバーを削除しますか？')) return
    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        alert('メンバーを削除しました')
        loadMembers()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  function startResetPassword(id: number, name: string) {
    setResetPasswordTarget({ id, name })
    setResetPasswordValue('')
  }

  function cancelResetPassword() {
    setResetPasswordTarget(null)
    setResetPasswordValue('')
  }

  async function submitResetPassword() {
    if (!resetPasswordTarget) return
    const { id, name } = resetPasswordTarget
    const newPassword = resetPasswordValue.trim()
    if (newPassword.length < 3) {
      alert('パスワードは3文字以上で設定してください')
      return
    }
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId: id, newPassword }),
      })
      if (response.ok) {
        alert(`${name}さんのパスワードをリセットしました\n新しいパスワード: ${newPassword}`)
        cancelResetPassword()
        loadMembers()
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  const membersByTeam: Record<string, Member[]> = {}
  teams.forEach(team => {
    membersByTeam[team] = members.filter(m => m.team === team && m.role !== 'admin')
  })
  // 未配属（team が null/空）の一般ユーザー
  const unassignedMembers = members.filter(m => !m.team && m.role !== 'admin')
  // 管理者（専用セクションに表示。パスワードリセットのみ可能）
  const adminMembers = members.filter(m => m.role === 'admin')

  // チームA〜J + 未配属 + 管理者 をまとめてセクション表示する
  const teamSections: { key: string; title: string; list: Member[] }[] = [
    ...teams.map(t => ({ key: t, title: `チーム${t}`, list: membersByTeam[t] || [] })),
    { key: 'UNASSIGNED', title: '未配属', list: unassignedMembers },
    { key: 'ADMIN', title: '管理者', list: adminMembers },
  ]

  if (loading) {
    return <div>読み込み中...</div>
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">
          <i className="fas fa-user-plus mr-2"></i>メンバー追加
        </h2>
        <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="社員番号"
            required
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="氏名"
            required
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {teams.map(t => (
              <option key={t} value={t}>チーム{t}</option>
            ))}
            <option value="">未配属</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            <i className="fas fa-plus mr-2"></i>追加
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teamSections.map(section => (
          <div key={section.key} className="bg-white rounded-lg shadow p-6">
            <h3 className={`text-lg font-bold mb-4 ${section.key === 'UNASSIGNED' ? 'text-gray-600' : section.key === 'ADMIN' ? 'text-purple-600' : 'text-blue-600'}`}>
              <i className={`fas ${section.key === 'UNASSIGNED' ? 'fa-user-slash' : section.key === 'ADMIN' ? 'fa-user-shield' : 'fa-users'} mr-2`}></i>{section.title} ({section.list.length}名)
            </h3>
            <div className="space-y-2">
              {section.list.map(member => (
                <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    {editingMemberId === member.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEditName(member.id, editingName, member.team)
                            } else if (e.key === 'Escape') {
                              cancelEditName()
                            }
                          }}
                        />
                        <button
                          onClick={() => saveEditName(member.id, editingName, member.team)}
                          className="text-green-600 hover:text-green-700"
                          title="保存"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={cancelEditName}
                          className="text-gray-600 hover:text-gray-700"
                          title="キャンセル"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="member-name flex items-center space-x-2">
                          <span>{member.name}</span>
                          {member.passwordResetRequestedAt && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                              title="パスワードリセット依頼あり"
                            >
                              <i className="fas fa-key mr-1"></i>リセット依頼
                            </span>
                          )}
                          {member.role !== 'admin' && (
                            <button
                              onClick={() => startEditName(member)}
                              className="text-blue-600 hover:text-blue-700 text-xs"
                              title="名前を編集"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                        </div>
                        <div className="member-username">{member.username}</div>
                      </>
                    )}
                  </div>
                  {member.role !== 'admin' && editingMemberId !== member.id ? (
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <select
                        value={member.team ?? ''}
                        onChange={(e) => handleUpdateTeam(member.id, member.name, e.target.value)}
                        className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {teams.map(t => (
                          <option key={t} value={t}>チーム{t}</option>
                        ))}
                        <option value="">未配属</option>
                      </select>
                      {resetPasswordTarget?.id === member.id ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <input
                            type="text"
                            value={resetPasswordValue}
                            onChange={(e) => setResetPasswordValue(e.target.value)}
                            placeholder="新パスワード（3文字以上）"
                            className="px-2 py-1 border rounded text-sm w-32 focus:ring-2 focus:ring-orange-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitResetPassword()
                              if (e.key === 'Escape') cancelResetPassword()
                            }}
                          />
                          <button
                            type="button"
                            onClick={submitResetPassword}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
                          >
                            設定
                          </button>
                          <button
                            type="button"
                            onClick={cancelResetPassword}
                            className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startResetPassword(member.id, member.name)}
                          className="text-orange-600 hover:text-orange-700"
                          title="パスワードリセット"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-500 hover:text-red-700"
                        title="削除"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ) : member.role === 'admin' && editingMemberId !== member.id ? (
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-xs text-gray-500">管理者</span>
                      {resetPasswordTarget?.id === member.id ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <input
                            type="text"
                            value={resetPasswordValue}
                            onChange={(e) => setResetPasswordValue(e.target.value)}
                            placeholder="新パスワード（3文字以上）"
                            className="px-2 py-1 border rounded text-sm w-32 focus:ring-2 focus:ring-orange-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitResetPassword()
                              if (e.key === 'Escape') cancelResetPassword()
                            }}
                          />
                          <button
                            type="button"
                            onClick={submitResetPassword}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
                          >
                            設定
                          </button>
                          <button
                            type="button"
                            onClick={cancelResetPassword}
                            className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startResetPassword(member.id, member.name)}
                          className="text-orange-600 hover:text-orange-700"
                          title="パスワードリセット"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              {section.list.length === 0 && (
                <p className="text-gray-400 text-center py-4">メンバーがいません</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
