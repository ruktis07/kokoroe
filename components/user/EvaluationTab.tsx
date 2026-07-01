'use client'

import { useState, useEffect, type KeyboardEvent } from 'react'

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

interface NextPeriod {
  yearMonth: string
  startDate: string
  endDate: string
}

/** PC表: ヘッダー1行 + メンバー2行分の最低高さ */
const PC_TABLE_MIN_HEIGHT = 'calc(3.75rem + 2 * 5.25rem)'
/** PC反転表: 項目列 + メンバー2列分の最低幅 */
const PC_TABLE_FLIPPED_MIN_WIDTH = 'calc(7.5em + 11rem)'

interface EvaluationTabProps {
  tableFlipped: boolean
  onTableFlippedChange: (flipped: boolean) => void
}

export default function EvaluationTab({ tableFlipped, onTableFlippedChange }: EvaluationTabProps) {
  const [teamMembers, setTeamMembers] = useState<Member[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [evaluations, setEvaluations] = useState<Record<string, number>>({})
  // 直近に保存済みの評価スナップショット（入力中の編集と区別し、入力済/未入力の判定に使う）
  const [savedEvaluations, setSavedEvaluations] = useState<Record<string, number>>({})
  const [previousEvaluations, setPreviousEvaluations] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // モバイル用: 対象者ごと / 項目ごと
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('by-person')
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [periodOpen, setPeriodOpen] = useState<boolean | null>(null)
  const [periodMessage, setPeriodMessage] = useState<string>('')
  const [nextPeriod, setNextPeriod] = useState<NextPeriod | null>(null)
  // 保存中フラグ（二重送信防止用）
  const [isSaving, setIsSaving] = useState(false)

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
        setNextPeriod(periodData.nextPeriod ?? null)
      } else {
        setPeriodOpen(false)
        setPeriodMessage('評価期間の確認に失敗しました')
        setNextPeriod(null)
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
        // 保存済みスナップショットも更新（入力済/未入力バッジの判定に使用）
        setSavedEvaluations({ ...evalMap })
      }

      if (prevRes.ok) {
        const prevData = await prevRes.json()
        const prevMap: Record<string, number> = {}
        if (prevData.previousEvaluations && Array.isArray(prevData.previousEvaluations)) {
          prevData.previousEvaluations.forEach((ev: Evaluation) => {
            prevMap[`${ev.evaluated_id}_${ev.item_id}`] = ev.score
          })
        }
        setPreviousEvaluations(prevMap)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  /** 小数点や e などを含まない 1～10 の整数文字列のみ反映 */
  function handleScoreChange(memberId: number, itemId: number, raw: string) {
    const key = `${memberId}_${itemId}`
    const s = raw.trim()
    if (s === '') {
      setEvaluations(prev => {
        const newEvals = { ...prev }
        delete newEvals[key]
        return newEvals
      })
      return
    }
    if (!/^([1-9]|10)$/.test(s)) return
    const numScore = parseInt(s, 10)
    setEvaluations(prev => ({
      ...prev,
      [key]: numScore,
    }))
  }

  function blockNonIntegerNumberKeys(e: KeyboardEvent<HTMLInputElement>) {
    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
      e.preventDefault()
    }
  }

  function applyPreviousScores() {
    if (!confirm('前回の評価結果を全て反映しますか？\n現在入力中の内容は上書きされます。')) {
      return
    }
    setEvaluations(prev => ({ ...prev, ...previousEvaluations }))
    alert('前回の評価結果を反映しました')
  }

  /** 保存済みデータを基に、そのメンバーの全項目が保存済みかを判定 */
  function isMemberSavedComplete(memberId: number): boolean {
    if (items.length === 0) return false
    return items.every(item => {
      const v = savedEvaluations[`${memberId}_${item.id}`]
      return typeof v === 'number' && v >= 1 && v <= 10
    })
  }

  /** メンバーの入力状況バッジ（保存済み判定ベース） */
  function renderMemberStatusBadge(memberId: number) {
    const complete = isMemberSavedComplete(memberId)
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap ${
          complete ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
        }`}
      >
        <i className={`fas ${complete ? 'fa-check' : 'fa-pen'} mr-1`}></i>
        {complete ? '入力済' : '未入力'}
      </span>
    )
  }

  /** 入力欄のボーダー色（未入力マスは目立たせる） */
  function cellBorderClass(key: string): string {
    return evaluations[key] ? 'border-gray-300' : 'border-amber-400 bg-amber-50'
  }

  async function saveAllEvaluations() {
    if (isSaving) return

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

    // 全マス（メンバー×項目）に対して未入力がある場合は確認する
    const expectedCount = teamMembers.length * items.length
    if (evaluationsToSave.length < expectedCount) {
      if (!confirm('未入力箇所があります。途中の入力までを保存しますか？')) {
        return
      }
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/evaluations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ evaluations: evaluationsToSave }),
      })
      if (response.ok) {
        alert(`${evaluationsToSave.length}件の評価を保存しました`)
        await loadData()
      } else {
        const data = await response.json()
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    } finally {
      setIsSaving(false)
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
          {nextPeriod && (
            <p className="text-sm text-amber-800 mt-3 font-medium">
              <i className="fas fa-calendar-alt mr-1"></i>
              次回評価期間: {nextPeriod.yearMonth}月度（{nextPeriod.startDate} 〜 {nextPeriod.endDate}まで）
            </p>
          )}
          <p className="text-sm text-gray-600 mt-4">
            評価の入力・保存は、管理者が設定した評価期間中のみ可能です。
          </p>
          <p className="text-sm text-gray-600 mt-2">
            打ち忘れ等で評価できなかった場合は管理者に連絡してください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6 md:flex md:flex-col md:max-h-[calc(100dvh-7rem)] md:min-h-0 md:overflow-y-auto">
      <div className="flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-3 md:mb-3 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            <i className="fas fa-users mr-2"></i>チームメンバー評価表
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
            <i className="fas fa-info-circle mr-1 sm:mr-2"></i>各項目を1～10点で評価（1:低い、10:高い）
          </p>
          {teamMembers.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              <i className="fas fa-list-check mr-1 sm:mr-2"></i>
              入力済:{' '}
              <span className="font-bold text-green-700">
                {teamMembers.filter(m => isMemberSavedComplete(m.id)).length}
              </span>
              {' / '}
              {teamMembers.length} 名（保存済みの内容で判定）
            </p>
          )}
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
              disabled={isSaving}
              aria-busy={isSaving}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base touch-manipulation min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-1 sm:mr-2"></i>保存中…
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-1 sm:mr-2"></i>全て保存
                </>
              )}
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
                  {selectedMemberId != null && (
                    <div className="mt-2">{renderMemberStatusBadge(selectedMemberId)}</div>
                  )}
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
                              inputMode="numeric"
                              min={1}
                              max={10}
                              step={1}
                              value={currentValue}
                              onKeyDown={blockNonIntegerNumberKeys}
                              onChange={(e) => handleScoreChange(selectedMemberId, item.id, e.target.value)}
                              placeholder="-"
                              className={`w-20 px-3 py-2.5 border-2 ${cellBorderClass(key)} rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation`}
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
                            <span className="text-sm text-gray-700 flex items-center gap-2">
                              {member.name}
                              {renderMemberStatusBadge(member.id)}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={10}
                                step={1}
                                value={currentValue}
                                onKeyDown={blockNonIntegerNumberKeys}
                                onChange={(e) => handleScoreChange(member.id, item.id, e.target.value)}
                                placeholder="-"
                                className={`w-20 px-3 py-2.5 border-2 ${cellBorderClass(key)} rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation`}
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
          <div className="hidden md:flex md:flex-shrink-0 md:items-center md:gap-3 md:mb-3">
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

          {/* PC用: 表（通常＝被評価者を行 / 反転＝項目を行）— 最低2人分が見えるサイズを確保 */}
          <div
            className="hidden md:block flex-1 overflow-auto border border-gray-200 rounded-lg min-w-0"
            style={{
              minHeight: PC_TABLE_MIN_HEIGHT,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {!tableFlipped ? (
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-left font-bold sticky left-0 top-0 z-30 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '6em' }}>
                      被評価者
                    </th>
                    {items.map(item => (
                      <th key={item.id} className="border border-gray-300 bg-blue-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[6em] sm:min-w-[10rem] max-w-[14rem] sticky top-0 z-20">
                        <div className="table-header-major-category text-xs sm:text-sm !whitespace-normal !min-w-0">{item.major_category || ''}</div>
                        <div className="table-header-minor-category text-[10px] sm:text-xs">{item.minor_category || ''}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(member => (
                    <tr key={member.id} className="hover:bg-blue-50">
                      <td className="border border-gray-300 bg-white px-2 sm:px-4 py-2.5 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-sm sm:text-base whitespace-nowrap align-top" style={{ minWidth: '6em', minHeight: '5.25rem' }}>
                        <div className="flex flex-col items-start gap-1">
                          <span>{member.name}</span>
                          {renderMemberStatusBadge(member.id)}
                        </div>
                      </td>
                      {items.map(item => {
                        const key = `${member.id}_${item.id}`
                        const currentValue = evaluations[key] || ''
                        const previousValue = previousEvaluations[key]
                        return (
                          <td key={item.id} className="border border-gray-300 bg-white px-1 sm:px-2 py-1.5 sm:py-2 text-center align-top" style={{ minHeight: '5.25rem' }}>
                            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="10"
                                step={1}
                                value={currentValue}
                                onKeyDown={blockNonIntegerNumberKeys}
                                onChange={(e) => handleScoreChange(member.id, item.id, e.target.value)}
                                placeholder="-"
                                className={`evaluation-input w-12 sm:w-16 px-1 sm:px-2 py-1.5 sm:py-2 border-2 ${cellBorderClass(key)} rounded text-center text-base sm:text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation`}
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
              <table
                className="min-w-full border-collapse border border-gray-300"
                style={{ minWidth: PC_TABLE_FLIPPED_MIN_WIDTH }}
              >
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-3 py-2 sm:py-3 text-left font-bold sticky left-0 top-0 z-30 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: '7.5em' }}>
                      評価項目
                    </th>
                    {teamMembers.map(member => (
                      <th key={member.id} className="border border-gray-300 bg-blue-700 text-white px-1.5 sm:px-2 py-2 sm:py-3 text-center min-w-[5.5rem] sticky top-0 z-20 text-sm sm:text-base">
                        <div className="flex flex-col items-center gap-1">
                          <span className="leading-tight">{member.name}</span>
                          {renderMemberStatusBadge(member.id)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50">
                      <td className="border border-gray-300 bg-white px-2 sm:px-3 py-2 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-base sm:text-lg align-top" style={{ minWidth: '7.5em', maxWidth: '14rem' }}>
                        <div className="evaluation-item-major-category text-sm sm:text-base break-words">{item.major_category || ''}</div>
                        <div className="evaluation-item-minor-category text-xs sm:text-sm break-words">{item.minor_category || ''}</div>
                      </td>
                      {teamMembers.map(member => {
                        const key = `${member.id}_${item.id}`
                        const currentValue = evaluations[key] || ''
                        const previousValue = previousEvaluations[key]
                        return (
                          <td key={member.id} className="border border-gray-300 bg-white px-1 sm:px-1.5 py-1.5 sm:py-2 text-center min-w-[5.5rem]">
                            <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="10"
                                step={1}
                                value={currentValue}
                                onKeyDown={blockNonIntegerNumberKeys}
                                onChange={(e) => handleScoreChange(member.id, item.id, e.target.value)}
                                placeholder="-"
                                className={`evaluation-input w-11 sm:w-14 px-1 py-1.5 sm:py-2 border-2 ${cellBorderClass(key)} rounded text-center text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation max-w-full`}
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

          <div className="md:hidden flex flex-wrap justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
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
              disabled={isSaving}
              aria-busy={isSaving}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-bold px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg text-sm sm:text-lg touch-manipulation min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-1 sm:mr-2"></i>保存中…
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-1 sm:mr-2"></i>全て保存
                </>
              )}
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
