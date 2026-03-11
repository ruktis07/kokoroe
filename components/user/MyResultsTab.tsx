'use client'

import { useState, useEffect } from 'react'

interface Evaluation {
  evaluated_id: number
  evaluated_name: string
  item_id: number
  major_category: string
  minor_category: string
  score: number
}

interface Item {
  id: number
  major_category: string
  minor_category: string
  display_order: number
}

interface MyResultsTabProps {
  tableFlipped: boolean
  onTableFlippedChange: (flipped: boolean) => void
}

/** APIの year_month (YYYY-MM) を「〇〇年〇月」形式に */
function formatYearMonthLabel(ym: string | null): string {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  if (!y || !m) return ym
  const monthNum = parseInt(m, 10)
  if (isNaN(monthNum)) return ym
  return `${y}年${monthNum}月`
}

export default function MyResultsTab({ tableFlipped, onTableFlippedChange }: MyResultsTabProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [yearMonth, setYearMonth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [evalsRes, itemsRes] = await Promise.all([
        fetch('/api/evaluations/my', { credentials: 'include' }),
        fetch('/api/items', { credentials: 'include' }),
      ])
      if (evalsRes.ok) {
        const data = await evalsRes.json()
        setEvaluations(data.evaluations || [])
        setYearMonth(data.year_month ?? null)
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  const scoreMap = new Map<string, number>()
  evaluations.forEach(ev => {
    scoreMap.set(`${ev.evaluated_id}_${ev.item_id}`, ev.score)
  })

  const members = Array.from(
    new Map(evaluations.map(ev => [ev.evaluated_id, { id: ev.evaluated_id, name: ev.evaluated_name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const periodLabel = yearMonth ? `${formatYearMonthLabel(yearMonth)}の評価内容` : '評価内容'

  if (evaluations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-2">
          <i className="fas fa-clipboard-list mr-2"></i>あなたの入力結果
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          <i className="fas fa-calendar-alt mr-2"></i>{periodLabel}
        </p>
        <p className="text-gray-400 text-center py-8">
          <i className="fas fa-info-circle mr-2"></i>{yearMonth ? 'まだ評価を入力していません' : '評価期間外です'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-2">
        <i className="fas fa-clipboard-list mr-2"></i>あなたの入力結果
      </h2>
      <p className="text-sm text-gray-600 mb-4 sm:mb-6">
        <i className="fas fa-calendar-alt mr-2"></i>{periodLabel}
      </p>

      {/* PC用: 表の向き切り替えボタン（採点タブと共有） */}
      <div className="hidden md:flex md:items-center md:gap-3 md:mb-3">
        <button
          type="button"
          onClick={() => onTableFlippedChange(!tableFlipped)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-sm font-medium"
          title={tableFlipped ? '被評価者を行・項目を列に戻す（横スクロール）' : '項目を行・被評価者を列にする（縦スクロールで見る）'}
        >
          <i className={`fas fa-arrows-alt-h ${tableFlipped ? 'rotate-90' : ''}`} aria-hidden />
          <span>{tableFlipped ? '表を元の向きに戻す' : '縦スクロールで見る（表を反転）'}</span>
        </button>
      </div>

      {/* PC用: 表（通常＝被評価者を行 / 反転＝項目を行） */}
      <div
        className={`hidden md:block -mx-3 sm:mx-0 px-3 sm:px-0 min-w-0 ${tableFlipped ? 'overflow-auto max-h-[70vh]' : 'overflow-x-auto'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {!tableFlipped ? (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-left font-bold sticky left-0 top-0 z-30 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '6em' }}>
                  被評価者
                </th>
                {items.map(item => (
                  <th key={item.id} className="border border-gray-300 bg-blue-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[8em] sm:min-w-[200px] sticky top-0 z-20">
                    <div className="table-header-major-category text-xs sm:text-sm">{item.major_category || ''}</div>
                    <div className="table-header-minor-category text-[10px] sm:text-xs">{item.minor_category || ''}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="hover:bg-blue-50">
                  <td className="border border-gray-300 bg-white px-2 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-sm sm:text-base whitespace-nowrap" style={{ minWidth: '6em' }}>
                    {member.name}
                  </td>
                  {items.map(item => {
                    const score = scoreMap.get(`${member.id}_${item.id}`)
                    return (
                      <td key={item.id} className="border border-gray-300 bg-white px-1 sm:px-2 py-1.5 sm:py-2 text-center">
                        {score != null ? (
                          <span className="text-base sm:text-lg font-semibold text-blue-600">{score}点</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-left font-bold sticky left-0 top-0 z-30 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '10em' }}>
                  評価項目
                </th>
                {members.map(member => (
                  <th key={member.id} className="border border-gray-300 bg-blue-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[6em] sm:min-w-[120px] sticky top-0 z-20">
                    {member.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="hover:bg-blue-50">
                  <td className="border border-gray-300 bg-white px-2 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-sm sm:text-base whitespace-nowrap" style={{ minWidth: '10em' }}>
                    <div className="evaluation-item-major-category text-xs sm:text-sm">{item.major_category || ''}</div>
                    <div className="evaluation-item-minor-category text-[10px] sm:text-xs">{item.minor_category || ''}</div>
                  </td>
                  {members.map(member => {
                    const score = scoreMap.get(`${member.id}_${item.id}`)
                    return (
                      <td key={member.id} className="border border-gray-300 bg-white px-1 sm:px-2 py-1.5 sm:py-2 text-center">
                        {score != null ? (
                          <span className="text-base sm:text-lg font-semibold text-blue-600">{score}点</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
