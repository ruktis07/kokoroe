'use client'

import { useState, useEffect } from 'react'

interface Member {
  id: number
  name: string
}

interface Item {
  id: number
  major_category: string
  minor_category: string
  display_order: number
}

interface Evaluation {
  evaluated_id: number
  item_id: number
  score: number
}

type MobileViewMode = 'by-person' | 'by-item'

interface EvaluationTabProps {
  tableFlipped: boolean
  onTableFlippedChange: (flipped: boolean) => void
}

export default function EvaluationTab({ tableFlipped, onTableFlippedChange }: EvaluationTabProps) {
  const [teamMembers, setTeamMembers] = useState<Member[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [evaluations, setEvaluations] = useState<Record<string, number>>({})
  const [previousEvaluations, setPreviousEvaluations] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // モバイル用: 対象者ごと / 項目ごと
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('by-person')
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [periodOpen, setPeriodOpen] = useState<boolean | null>(null)
  const [periodMessage, setPeriodMessage] = useState<string>('')

  // 大項目の一覧（表示順）
  const majorCategories = items.length
    ? [...new Set(items.map((i) => i.major_category))].filter(Boolean).sort((a, b) => {
        const orderA = items.find((i) => i.major_category === a)?.display_order ?? 0
        const orderB = items.find((i) => i.major_category === b)?.display_order ?? 0
        return orderA - orderB
      })
    : []
  // 選択中・大項目に属する中項目（表示順）。ALL の場合は全項目
  const itemsInSelectedMajor =
    selectedMajor == null
      ? []
      : selectedMajor === 'ALL'
        ? items.slice().sort((a, b) => a.display_order - b.display_order)
        : items.filter((i) => i.major_category === selectedMajor).sort((a, b) => a.display_order - b.display_order)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [periodRes, membersRes, itemsRes, evalsRes, prevRes] = await Promise.all([
        fetch('/api/evaluation-period-status', { credentials: 'include' }),
        fetch('/api/team-members', { credentials: 'include' }),
        fetch('/api/items', { credentials: 'include' }),
        fetch('/api/evaluations/my', { credentials: 'include' }),
        fetch('/api/evaluations/previous', { credentials: 'include' }),
      ])

      if (periodRes.ok) {
        const periodData = await periodRes.json()
        setPeriodOpen(periodData.isOpen === true)
        setPeriodMessage(periodData.message || '')
      } else {
        setPeriodOpen(false)
        setPeriodMessage('評価期間の確認に失敗しました')
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setTeamMembers(membersData.members)
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setItems(itemsData.items)
      }

      if (evalsRes.ok) {
        const evalsData = await evalsRes.json()
        const evalMap: Record<string, number> = {}
        evalsData.evaluations.forEach((ev: Evaluation & { evaluated_id: number; item_id: number; score: number }) => {
          evalMap[`${ev.evaluated_id}_${ev.item_id}`] = ev.score
        })
        setEvaluations(evalMap)
      }

      if (prevRes.ok) {
        const prevData = await prevRes.json()
        console.log('前回評価データ:', prevData)
        const prevMap: Record<string, number> = {}
        if (prevData.previousEvaluations && Array.isArray(prevData.previousEvaluations)) {
          prevData.previousEvaluations.forEach((ev: Evaluation) => {
            prevMap[`${ev.evaluated_id}_${ev.item_id}`] = ev.score
          })
        }
        console.log('前回評価マップ:', prevMap)
        console.log('前回評価データ数:', Object.keys(prevMap).length)
        setPreviousEvaluations(prevMap)
      } else {
        console.log('前回評価データの取得に失敗:', prevRes.status, prevRes.statusText)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleScoreChange(memberId: number, itemId: number, score: string) {
    const key = `${memberId}_${itemId}`
    if (score && score.trim() !== '') {
      const numScore = parseInt(score)
      if (!isNaN(numScore)) {
        setEvaluations(prev => ({
          ...prev,
          [key]: numScore,
        }))
      }
    } else {
      // 空の場合はキーを削除
      setEvaluations(prev => {
        const newEvals = { ...prev }
        delete newEvals[key]
        return newEvals
      })
    }
  }

  function applyPreviousScores() {
    if (!confirm('前回の評価結果を全て反映しますか？\n現在入力中の内容は上書きされます。')) {
      return
    }
    setEvaluations(prev => ({ ...prev, ...previousEvaluations }))
    alert('前回の評価結果を反映しました')
  }

  async function saveAllEvaluations() {
    const evaluationsToSave = []
    for (const member of teamMembers) {
      for (const item of items) {
        const key = `${member.id}_${item.id}`
        const score = evaluations[key]
        if (score && score >= 1 && score <= 10) {
          evaluationsToSave.push({
            evaluated_id: member.id,
            item_id: item.id,
            score,
          })
        }
      }
    }

    if (evaluationsToSave.length === 0) {
      alert('評価を入力してください')
      return
    }

    try {
      const response = await fetch('/api/evaluations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ evaluations: evaluationsToSave }),
      })
      if (response.ok) {
        alert(`${evaluationsToSave.length}件の評価を保存しました`)
        loadData()
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

  if (periodOpen === false) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-6">
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6 sm:p-8 text-center">
          <p className="text-lg sm:text-xl font-bold text-amber-800">
            <i className="fas fa-calendar-times mr-2"></i>評価期間ではありません
          </p>
          {periodMessage && (
            <p className="text-sm text-amber-700 mt-2">{periodMessage}</p>
          )}
          <p className="text-sm text-gray-600 mt-4">
            評価の入力・保存は、管理者が設定した評価期間中のみ可能です。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            <i className="fas fa-users mr-2"></i>チームメンバー評価表
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
            <i className="fas fa-info-circle mr-1 sm:mr-2"></i>各項目を1～10点で評価（1:低い、10:高い）
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {Object.keys(previousEvaluations).length > 0 ? (
            <button
              onClick={applyPreviousScores}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base touch-manipulation min-h-[44px]"
            >
              <i className="fas fa-history mr-1 sm:mr-2"></i>前回を反映
            </button>
          ) : (
            <div className="text-xs text-gray-500 self-center">
              前回: {Object.keys(previousEvaluations).length}件
            </div>
          )}
          {teamMembers.length > 0 && (
            <button
              onClick={saveAllEvaluations}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base touch-manipulation min-h-[44px]"
            >
              <i className="fas fa-save mr-1 sm:mr-2"></i>全て保存
            </button>
          )}
        </div>
      </div>

      {teamMembers.length > 0 ? (
        <>
          {/* モバイル用: 対象者ごと / 項目ごとで採点 */}
          <div className="md:hidden space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-medium text-gray-700">表示方法:</span>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mobileViewMode"
                  checked={mobileViewMode === 'by-person'}
                  onChange={() => {
                    setMobileViewMode('by-person')
                    setSelectedMajor(null)
                    setSelectedItemId(null)
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">対象者ごと</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mobileViewMode"
                  checked={mobileViewMode === 'by-item'}
                  onChange={() => {
                    setMobileViewMode('by-item')
                    setSelectedMemberId(null)
                    setSelectedMajor(null)
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">項目ごと</span>
              </label>
            </div>

            {mobileViewMode === 'by-person' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象者</label>
                  <select
                    value={selectedMemberId ?? ''}
                    onChange={(e) => setSelectedMemberId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white"
                  >
                    <option value="">選択してください</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">大項目</label>
                  <select
                    value={selectedMajor ?? ''}
                    onChange={(e) => setSelectedMajor(e.target.value || null)}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white"
                  >
                    <option value="">選択してください</option>
                    <option value="ALL">ALL（すべて）</option>
                    {majorCategories.map((major) => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </select>
                </div>
                {selectedMemberId != null && selectedMajor != null && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-2">
                      中項目と採点（1～10）
                    </h3>
                    {itemsInSelectedMajor.map((item) => {
                      const key = `${selectedMemberId}_${item.id}`
                      const currentValue = evaluations[key] ?? ''
                      const prevValue = previousEvaluations[key]
                      const label = selectedMajor === 'ALL' ? `${item.major_category} / ${item.minor_category}` : item.minor_category
                      return (
                        <div key={item.id} className="flex flex-col gap-1">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={currentValue}
                              onChange={(e) => handleScoreChange(selectedMemberId, item.id, e.target.value)}
                              placeholder="-"
                              className="w-20 px-3 py-2.5 border-2 border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                            />
                            {prevValue != null && (
                              <span className="text-xs text-gray-500"><i className="fas fa-history mr-1"></i>前回: {prevValue}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {mobileViewMode === 'by-item' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">中項目</label>
                  <select
                    value={selectedItemId ?? ''}
                    onChange={(e) => setSelectedItemId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white"
                  >
                    <option value="">選択してください</option>
                    {items
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.major_category} / {item.minor_category}
                        </option>
                      ))}
                  </select>
                </div>
                {selectedItemId != null && (() => {
                  const item = items.find((i) => i.id === selectedItemId)
                  if (!item) return null
                  return (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-2">
                        {item.major_category} — {item.minor_category}
                      </h3>
                      {teamMembers.map((member) => {
                        const key = `${member.id}_${item.id}`
                        const currentValue = evaluations[key] ?? ''
                        const prevValue = previousEvaluations[key]
                        return (
                          <div key={member.id} className="flex flex-col gap-1">
                            <span className="text-sm text-gray-700">{member.name}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={currentValue}
                                onChange={(e) => handleScoreChange(member.id, item.id, e.target.value)}
                                placeholder="-"
                                className="w-20 px-3 py-2.5 border-2 border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                              />
                              {prevValue != null && (
                                <span className="text-xs text-gray-500"><i className="fas fa-history mr-1"></i>前回: {prevValue}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* PC用: 表の向き切り替えボタン */}
          <div className="hidden md:flex md:items-center md:gap-3 md:mb-3">
            <button
              type="button"
              onClick={() => onTableFlippedChange(!tableFlipped)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-sm font-medium"
              title={tableFlipped ? '被評価者を行・項目を列に戻す（横スクロール）' : '項目を行・被評価者を列にする（縦スクロールで採点）'}
            >
              <i className={`fas fa-arrows-alt-h ${tableFlipped ? 'rotate-90' : ''}`} aria-hidden />
              <span>{tableFlipped ? '表を元の向きに戻す' : '縦スクロールで採点（表を反転）'}</span>
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
                  {teamMembers.map(member => (
                    <tr key={member.id} className="hover:bg-blue-50">
                      <td className="border border-gray-300 bg-white px-2 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-sm sm:text-base whitespace-nowrap" style={{ minWidth: '6em' }}>
                        {member.name}
                      </td>
                      {items.map(item => {
                        const key = `${member.id}_${item.id}`
                        const currentValue = evaluations[key] || ''
                        const previousValue = previousEvaluations[key]
                        return (
                          <td key={item.id} className="border border-gray-300 bg-white px-1 sm:px-2 py-1.5 sm:py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={currentValue}
                                onChange={(e) => handleScoreChange(member.id, item.id, e.target.value)}
                                placeholder="-"
                                className="evaluation-input w-12 sm:w-16 px-1 sm:px-2 py-1.5 sm:py-2 border-2 border-gray-300 rounded text-center text-base sm:text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                              />
                              {previousValue && (
                                <span className="text-[10px] sm:text-xs text-gray-500">
                                  <i className="fas fa-history mr-0.5 sm:mr-1"></i>前回: {previousValue}
                                </span>
                              )}
                            </div>
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
                    <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-3 py-2 sm:py-3 text-left font-bold sticky left-0 top-0 z-30 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '7.5em' }}>
                      評価項目
                    </th>
                    {teamMembers.map(member => (
                      <th key={member.id} className="border border-gray-300 bg-blue-700 text-white px-1.5 sm:px-2 py-2 sm:py-3 text-center min-w-[4.5rem] sm:min-w-[5rem] sticky top-0 z-20 text-sm sm:text-base">
                        {member.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50">
                      <td className="border border-gray-300 bg-white px-2 sm:px-3 py-2 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-base sm:text-lg whitespace-nowrap" style={{ minWidth: '7.5em' }}>
                        <div className="evaluation-item-major-category text-sm sm:text-base">{item.major_category || ''}</div>
                        <div className="evaluation-item-minor-category text-xs sm:text-sm">{item.minor_category || ''}</div>
                      </td>
                      {teamMembers.map(member => {
                        const key = `${member.id}_${item.id}`
                        const currentValue = evaluations[key] || ''
                        const previousValue = previousEvaluations[key]
                        return (
                          <td key={member.id} className="border border-gray-300 bg-white px-1 sm:px-1.5 py-1.5 sm:py-2 text-center min-w-0">
                            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={currentValue}
                                onChange={(e) => handleScoreChange(member.id, item.id, e.target.value)}
                                placeholder="-"
                                className="evaluation-input w-11 sm:w-14 px-1 py-1.5 sm:py-2 border-2 border-gray-300 rounded text-center text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation max-w-full"
                              />
                              {previousValue && (
                                <span className="text-[10px] sm:text-xs text-gray-500">
                                  <i className="fas fa-history mr-0.5 sm:mr-1"></i>前回: {previousValue}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
            {Object.keys(previousEvaluations).length > 0 ? (
              <button
                onClick={applyPreviousScores}
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg text-sm sm:text-lg touch-manipulation min-h-[44px]"
              >
                <i className="fas fa-history mr-1 sm:mr-2"></i>前回を反映
              </button>
            ) : (
              <div className="text-xs sm:text-sm text-gray-500">
                前回データなし
              </div>
            )}
            <button
              onClick={saveAllEvaluations}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg text-sm sm:text-lg touch-manipulation min-h-[44px]"
            >
              <i className="fas fa-save mr-1 sm:mr-2"></i>全て保存
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-400 text-center py-8">
          <i className="fas fa-info-circle mr-2"></i>評価対象のチームメンバーがいません
        </p>
      )}
    </div>
  )
}
