'use client'

import { useState, useEffect } from 'react'
import { downloadCsv } from '@/lib/csv'

interface TabViewLogEntry {
  id: number
  userId: number
  userName: string
  username: string
  team: string | null
  tab: string
  viewedAt: string
}

export default function TabViewLogsTab() {
  const [logs, setLogs] = useState<TabViewLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    try {
      const res = await fetch('/api/admin/tab-view-logs', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  function handleExportCsv() {
    const rows = logs.map((log) => ({
      viewedAt: new Date(log.viewedAt).toLocaleString('ja-JP'),
      userName: log.userName,
      username: log.username,
      team: log.team ?? '',
    }))
    const headers = [
      { key: 'viewedAt', label: '日時' },
      { key: 'userName', label: '氏名' },
      { key: 'username', label: 'ユーザー名' },
      { key: 'team', label: 'チーム' },
    ]
    downloadCsv(rows, headers, `集計ログ_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-2">
        <i className="fas fa-history mr-2"></i>集計ログ
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-gray-600">
          利用者が「集計」タブを表示した日時です。2か月を超えたログは自動で削除されます。
        </p>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium flex-shrink-0"
          >
            <i className="fas fa-file-csv"></i>
            CSV出力
          </button>
        )}
      </div>
      {logs.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">まだ表示履歴がありません</p>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0 border border-gray-200 rounded-lg">
          <table className="min-w-full border-collapse text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="border border-gray-300 px-3 py-2 text-left whitespace-nowrap">日時</th>
                <th className="border border-gray-300 px-3 py-2 text-left whitespace-nowrap">氏名</th>
                <th className="border border-gray-300 px-3 py-2 text-left whitespace-nowrap">ユーザー名</th>
                <th className="border border-gray-300 px-3 py-2 text-left whitespace-nowrap">チーム</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                    {new Date(log.viewedAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">{log.userName}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-600">{log.username}</td>
                  <td className="border border-gray-300 px-3 py-2">{log.team ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
