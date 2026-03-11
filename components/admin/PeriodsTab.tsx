'use client'

import { useState, useEffect } from 'react'

interface Period {
  id: number
  year_month: string
  start_date: string
  end_date: string
  is_active: boolean
}

export default function PeriodsTab() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [newMonth, setNewMonth] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  const [editMonth, setEditMonth] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editActive, setEditActive] = useState(true)

  useEffect(() => {
    loadPeriods()
  }, [])

  async function loadPeriods() {
    try {
      const response = await fetch('/api/admin/evaluation-periods', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setPeriods(data.periods || [])
      }
    } catch (error) {
      console.error('Failed to load periods:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddPeriod(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/evaluation-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          yearMonth: newMonth,
          startDate: newStart,
          endDate: newEnd,
        }),
      })
      if (response.ok) {
        alert('評価期間を追加しました')
        setNewMonth('')
        setNewStart('')
        setNewEnd('')
        loadPeriods()
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  async function handleToggleActive(id: number, currentActive: boolean) {
    const period = periods.find(p => p.id === id)
    if (!period) return

    try {
      const response = await fetch(`/api/admin/evaluation-periods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          startDate: period.start_date,
          endDate: period.end_date,
          isActive: !currentActive,
        }),
      })
      if (response.ok) {
        alert(`評価期間を${currentActive ? '無効' : '有効'}にしました`)
        loadPeriods()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  async function handleDeletePeriod(id: number) {
    if (!confirm('この評価期間を削除しますか？')) return
    try {
      const response = await fetch(`/api/admin/evaluation-periods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        alert('評価期間を削除しました')
        loadPeriods()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  function openEditModal(period: Period) {
    setEditingPeriod(period)
    setEditMonth(period.year_month)
    setEditStart(period.start_date)
    setEditEnd(period.end_date)
    setEditActive(period.is_active)
  }

  function closeEditModal() {
    setEditingPeriod(null)
  }

  async function handleUpdatePeriod(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPeriod) return
    try {
      const response = await fetch(`/api/admin/evaluation-periods/${editingPeriod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          yearMonth: editMonth,
          startDate: editStart,
          endDate: editEnd,
          isActive: editActive,
        }),
      })
      if (response.ok) {
        alert('評価期間を更新しました')
        closeEditModal()
        loadPeriods()
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">
          <i className="fas fa-plus-circle mr-2"></i>評価期間追加
        </h2>
        <form onSubmit={handleAddPeriod} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">月度</label>
            <input
              type="month"
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              <i className="fas fa-plus mr-2"></i>追加
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          <i className="fas fa-calendar-check mr-2"></i>評価期間一覧
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold">月度</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">開始日</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">終了日</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">状態</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-blue-600">{period.year_month}</td>
                  <td className="px-4 py-3 text-gray-700">{period.start_date}</td>
                  <td className="px-4 py-3 text-gray-700">{period.end_date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${period.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {period.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(period)}
                        className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded"
                        title="変更"
                      >
                        <i className="fas fa-edit"></i><span className="ml-1 text-sm">変更</span>
                      </button>
                      <button
                        onClick={() => handleToggleActive(period.id, period.is_active)}
                        className={`px-2 py-1 rounded text-sm ${period.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                        title={period.is_active ? '無効化' : '有効化'}
                      >
                        <i className={`fas fa-${period.is_active ? 'pause' : 'play'}-circle`}></i>
                      </button>
                      <button
                        onClick={() => handleDeletePeriod(period.id)}
                        className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                        title="削除"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {periods.length === 0 && (
          <p className="text-gray-400 text-center py-8">評価期間が設定されていません</p>
        )}
      </div>

      {/* 変更モーダル */}
      {editingPeriod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeEditModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              <i className="fas fa-edit mr-2"></i>評価期間を変更
            </h3>
            <form onSubmit={handleUpdatePeriod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月度</label>
                <input
                  type="month"
                  value={editMonth}
                  onChange={(e) => setEditMonth(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                <input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="edit-active" className="text-sm font-medium text-gray-700">有効</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
