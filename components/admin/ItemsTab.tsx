'use client'

import { useState, useEffect } from 'react'

interface Item {
  id: number
  major_category: string
  minor_category: string
  display_order: number
}

export default function ItemsTab() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newMajor, setNewMajor] = useState('')
  const [newMinor, setNewMinor] = useState('')
  const [newOrder, setNewOrder] = useState(1)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const response = await fetch('/api/items', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
        setNewOrder(data.items.length + 1)
      }
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          major_category: newMajor,
          minor_category: newMinor,
          display_order: newOrder,
        }),
      })
      if (response.ok) {
        alert('評価項目を追加しました')
        setNewMajor('')
        setNewMinor('')
        loadItems()
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  async function handleUpdateItem(id: number, major: string, minor: string, order: number) {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          major_category: major,
          minor_category: minor,
          display_order: order,
        }),
      })
      if (response.ok) {
        alert('評価項目を更新しました')
        setEditingId(null)
        loadItems()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('この評価項目を削除しますか？関連する評価データも削除されます。')) return
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        alert('評価項目を削除しました')
        loadItems()
      } else {
        alert('エラーが発生しました')
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
          <i className="fas fa-plus-circle mr-2"></i>評価項目追加
        </h2>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={newMajor}
            onChange={(e) => setNewMajor(e.target.value)}
            placeholder="大項目"
            required
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newMinor}
            onChange={(e) => setNewMinor(e.target.value)}
            placeholder="中項目"
            required
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min={1}
            max={items.length + 1}
            value={newOrder}
            onChange={(e) => setNewOrder(Math.max(1, parseInt(e.target.value, 10) || 1))}
            placeholder="表示順（指定した番号に挿入し、以降は1つずつずれます）"
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            <i className="fas fa-plus mr-2"></i>追加
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          <i className="fas fa-list mr-2"></i>評価項目一覧
        </h2>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
              {editingId === item.id ? (
                <EditItemForm
                  item={item}
                  itemsCount={items.length}
                  onSave={(major, minor, order) => handleUpdateItem(item.id, major, minor, order)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="evaluation-item-major-category">{item.major_category || ''}</div>
                    <div className="evaluation-item-minor-category">{item.minor_category || ''}</div>
                    <div className="text-xs text-gray-400 mt-1">表示順: {item.display_order}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="text-blue-600 hover:text-blue-700"
                      title="編集"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                      title="削除"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EditItemForm({
  item,
  itemsCount,
  onSave,
  onCancel,
}: {
  item: Item
  itemsCount: number
  onSave: (major: string, minor: string, order: number) => void
  onCancel: () => void
}) {
  const [major, setMajor] = useState(item.major_category || '')
  const [minor, setMinor] = useState(item.minor_category || '')
  const [order, setOrder] = useState(item.display_order)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <input
        type="text"
        value={major}
        onChange={(e) => setMajor(e.target.value)}
        placeholder="大項目"
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        value={minor}
        onChange={(e) => setMinor(e.target.value)}
        placeholder="中項目"
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="number"
        min={1}
        max={itemsCount}
        value={order}
        onChange={(e) => setOrder(Math.max(1, Math.min(itemsCount, parseInt(e.target.value, 10) || 1)))}
        placeholder="表示順（指定番号に移動し、以降は1つずつずれます）"
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex space-x-2">
        <button
          onClick={() => onSave(major, minor, order)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex-1"
        >
          <i className="fas fa-save mr-1"></i>保存
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex-1"
        >
          <i className="fas fa-times mr-1"></i>キャンセル
        </button>
      </div>
    </div>
  )
}
