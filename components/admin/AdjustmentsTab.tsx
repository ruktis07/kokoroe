'use client'

import { useState, useEffect, useRef } from 'react'

interface Evaluation {
  id: number
  evaluator_id: number
  evaluator_name: string
  evaluated_id: number
  evaluated_name: string
  evaluated_team: string
  item_id: number
  score: number
  year_month: string | null
}

interface Member {
  id: number
  name: string
  team: string | null
  role: string
}

interface Item {
  id: number
  major_category: string
  minor_category: string
  display_order: number
}

interface EvalPeriod {
  id: number
  year_month: string
  start_date: string
  end_date: string
  is_active: boolean
}

/** YYYY-MM-DD に 1 日足した日付（YYYY-MM-DD） */
function addOneDay(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function AdjustmentsTab() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [yearMonths, setYearMonths] = useState<{ year_month: string }[]>([])
  const [periods, setPeriods] = useState<EvalPeriod[]>([])
  const [adjustedYearMonths, setAdjustedYearMonths] = useState<Set<string>>(new Set())
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filterEvaluator, setFilterEvaluator] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const normalizedForRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [evalsRes, itemsRes, yearMonthsRes, periodsRes, adjustedRes, membersRes] = await Promise.all([
        fetch('/api/admin/evaluations', { credentials: 'include' }),
        fetch('/api/items', { credentials: 'include' }),
        fetch('/api/admin/evaluation-year-months', { credentials: 'include' }),
        fetch('/api/admin/evaluation-periods', { credentials: 'include' }),
        fetch('/api/admin/adjusted-year-months', { credentials: 'include' }),
        fetch('/api/members', { credentials: 'include' }),
      ])
      if (evalsRes.ok && itemsRes.ok) {
        const evalsData = await evalsRes.json()
        const itemsData = await itemsRes.json()
        setEvaluations(evalsData.evaluations)
        setItems(itemsData.items)
      }
      if (yearMonthsRes.ok) {
        const { year_months } = await yearMonthsRes.json()
        setYearMonths(year_months || [])
        if ((year_months?.length ?? 0) > 0 && !selectedYearMonth) {
          setSelectedYearMonth(year_months[0].year_month)
        }
      }
      if (periodsRes.ok) {
        const data = await periodsRes.json()
        setPeriods(data.periods || [])
      }
      if (adjustedRes.ok) {
        const { year_months } = await adjustedRes.json()
        setAdjustedYearMonths(new Set(year_months || []))
      }
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers((data.members || []).filter((m: Member) => m.role === 'user' && m.team))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateScore(id: number, newScore: number) {
    if (newScore < 1 || newScore > 10) {
      alert('点数は1～10の範囲で入力してください')
      return
    }

    try {
      const response = await fetch(`/api/admin/evaluations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ score: newScore }),
      })
      if (response.ok) {
        loadData()
      } else {
        alert('エラーが発生しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  function exportCSV(type: 'evaluations' | 'summary') {
    const defaultYm = selectedYearMonth || new Date().toISOString().slice(0, 7)
    const yearMonth = prompt('エクスポートする年月を入力してください（例: 2026-01）', defaultYm)
    if (!yearMonth) return
    window.location.href = `/api/admin/export-${type === 'evaluations' ? 'csv' : 'summary-csv'}?year_month=${yearMonth}`
  }

  async function runNormalizeTeamScores(yearMonth: string, silent = false) {
    try {
      const response = await fetch(`/api/admin/normalize-team-scores?year_month=${yearMonth}`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok) {
        normalizedForRef.current.add(yearMonth)
        if (!silent) {
          const count = data.adjusted_count ?? data.updated_count ?? 0
          alert(`チーム間調整が完了しました。\n\n${yearMonth}：${count}件の他者スコアを調整しました。`)
        }
        loadData()
      } else if (!silent) {
        alert(data.error || 'エラーが発生しました')
      }
    } catch (error) {
      if (!silent) alert('エラーが発生しました')
    }
  }

  async function handleNormalizeTeamScores() {
    if (yearMonths.length === 0) {
      alert('評価データがありません。シードを実行するか、ユーザーに評価を入力してもらってください。')
      return
    }
    const defaultYm = selectedYearMonth || yearMonths[0]?.year_month || new Date().toISOString().slice(0, 7)
    const yearMonth = prompt('チーム間調整する年月を入力してください', defaultYm)
    if (!yearMonth) return
    if (!confirm(`${yearMonth}の評価について、項目ごとに全チーム平均とチーム平均の差で採点を調整します。\n全チーム平均より低いチームは差分をプラス、高いチームはマイナスします。実行しますか？`)) return
    await runNormalizeTeamScores(yearMonth, false)
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  // 選択した年月でフィルタ（year_month が null のデータは全期間に含める）
  const evaluationsForPeriod = selectedYearMonth
    ? evaluations.filter(ev => ev.year_month === selectedYearMonth)
    : evaluations

  const evaluators = [...new Set(evaluationsForPeriod.map(ev => ev.evaluator_name))].sort()
  const filteredEvals = filterEvaluator
    ? evaluationsForPeriod.filter(ev => ev.evaluator_name === filterEvaluator)
    : evaluationsForPeriod

  // データを整形
  const byTeam: Record<string, Record<string, Record<string, Record<number, Evaluation>>>> = {}
  filteredEvals.forEach(ev => {
    const team = ev.evaluated_team
    if (!byTeam[team]) byTeam[team] = {}
    if (!byTeam[team][ev.evaluator_name]) byTeam[team][ev.evaluator_name] = {}
    if (!byTeam[team][ev.evaluator_name][ev.evaluated_name]) {
      byTeam[team][ev.evaluator_name][ev.evaluated_name] = {}
    }
    byTeam[team][ev.evaluator_name][ev.evaluated_name][ev.item_id] = ev
  })

  // 未評価者を算出（選択中の年月）
  const expectedItemCount = items.length
  const teamMembersByTeam: Record<string, Member[]> = {}
  members.forEach(m => {
    const t = m.team!
    if (!teamMembersByTeam[t]) teamMembersByTeam[t] = []
    teamMembersByTeam[t].push(m)
  })
  const pairCount = new Map<string, number>()
  evaluationsForPeriod.forEach(ev => {
    const key = `${ev.evaluator_id}_${ev.evaluated_id}`
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
  })
  const notSubmittedByTeam: Record<string, string[]> = {}
  const incompleteByTeam: Record<string, { evaluatorName: string; missing: string[] }[]> = {}
  Object.keys(teamMembersByTeam).forEach(team => {
    const teamMembersList = teamMembersByTeam[team]
    const evaluatorIds = new Set(teamMembersList.map(m => m.id))
    const submittedEvaluatorIds = new Set(
      evaluationsForPeriod.filter(ev => ev.evaluated_team === team).map(ev => ev.evaluator_id)
    )
    const notSubmitted = teamMembersList.filter(m => !submittedEvaluatorIds.has(m.id)).map(m => m.name)
    if (notSubmitted.length > 0) notSubmittedByTeam[team] = notSubmitted
    const incomplete: { evaluatorName: string; missing: string[] }[] = []
    teamMembersList.forEach(evaluator => {
      if (!submittedEvaluatorIds.has(evaluator.id)) return
      const missing: string[] = []
      teamMembersList.forEach(evaluated => {
        const key = `${evaluator.id}_${evaluated.id}`
        const count = pairCount.get(key) ?? 0
        if (count < expectedItemCount) missing.push(evaluated.name)
      })
      if (missing.length > 0) incomplete.push({ evaluatorName: evaluator.name, missing })
    })
    if (incomplete.length > 0) incompleteByTeam[team] = incomplete
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold">
            <i className="fas fa-edit mr-2"></i>採点調整
          </h2>
          <div className="flex items-center space-x-3 flex-wrap">
            <button
              onClick={handleNormalizeTeamScores}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg"
              title="項目ごとに全チーム平均とチーム平均の差で採点を調整"
            >
              <i className="fas fa-balance-scale mr-2"></i>チーム間調整
            </button>
            <button
              onClick={() => exportCSV('evaluations')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              <i className="fas fa-file-csv mr-2"></i>評価データCSV出力
            </button>
            <button
              onClick={() => exportCSV('summary')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              <i className="fas fa-chart-bar mr-2"></i>集計結果CSV出力
            </button>
          </div>
        </div>
      {yearMonths.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 mb-2">
            <i className="fas fa-info-circle mr-1"></i>
            表示・CSV出力・チーム間調整は選択した年月のデータが対象です。データがない年月を指定すると空になります。
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">
              <i className="fas fa-calendar mr-2"></i>年月:
            </label>
            <select
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {yearMonths.map(ym => (
                <option key={ym.year_month} value={ym.year_month}>
                  {ym.year_month}{adjustedYearMonths.has(ym.year_month) ? ' 　調整済み' : ''}
                </option>
              ))}
            </select>
            {selectedYearMonth && adjustedYearMonths.has(selectedYearMonth) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i className="fas fa-check-circle mr-1"></i>調整済み
              </span>
            )}
          </div>
        </div>
      )}
      {yearMonths.length === 0 && !loading && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          評価データがありません。シードを実行するか、ユーザーに評価を入力してもらってください。
        </div>
      )}
      <div className="flex items-center space-x-3 mb-4">
        <label className="text-sm font-medium text-gray-700">
          <i className="fas fa-filter mr-2"></i>評価者で絞り込み:
        </label>
        <select
          value={filterEvaluator}
          onChange={(e) => setFilterEvaluator(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全員</option>
          {evaluators.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {selectedYearMonth && (Object.keys(notSubmittedByTeam).length > 0 || Object.keys(incompleteByTeam).length > 0) && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-sm font-bold text-amber-900 mb-3">
            <i className="fas fa-exclamation-triangle mr-2"></i>未評価者（{selectedYearMonth}）
          </h3>
          <div className="space-y-3 text-sm">
            {Object.keys(notSubmittedByTeam).sort().map(team => (
              <div key={team}>
                <span className="font-semibold text-amber-800">チーム{team}</span>
                <span className="text-amber-700"> ・ 採点未入力: </span>
                <span className="text-amber-900">{notSubmittedByTeam[team].join('、')}</span>
              </div>
            ))}
            {Object.keys(incompleteByTeam).sort().map(team => (
              <div key={team} className="mt-2">
                <span className="font-semibold text-amber-800">チーム{team} ・ 採点未完了: </span>
                <ul className="list-disc list-inside ml-2 mt-1 text-amber-900">
                  {incompleteByTeam[team].map(({ evaluatorName, missing }) => (
                    <li key={evaluatorName}>
                      {evaluatorName} → 未入力: {missing.join('、')}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {Object.keys(byTeam).sort().map(team => (
          <div key={team}>
            <h3 className="text-lg font-bold text-blue-600 mb-4">チーム{team}</h3>
            {Object.keys(byTeam[team]).sort().map(evaluatorName => (
              <div key={evaluatorName} className="mb-6">
                <h4 className="text-md font-semibold text-gray-700 mb-2 pl-2 border-l-4 border-green-500">
                  <i className="fas fa-user mr-2"></i>評価者: {evaluatorName}
                </h4>
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-left font-bold sticky left-0 z-10 whitespace-nowrap" style={{ minWidth: '6em' }}>
                          被評価者
                        </th>
                        {items.map(item => (
                          <th key={item.id} className="border border-gray-300 bg-blue-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[8em] sm:min-w-[200px]">
                            <div className="table-header-major-category text-xs sm:text-sm">{item.major_category || ''}</div>
                            <div className="table-header-minor-category text-[10px] sm:text-xs">{item.minor_category || ''}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(byTeam[team][evaluatorName]).sort().map(evaluatedName => {
                        const member = byTeam[team][evaluatorName][evaluatedName]
                        return (
                          <tr key={evaluatedName} className="hover:bg-blue-50">
                            <td className="border border-gray-300 bg-white px-2 sm:px-4 py-2 sm:py-3 font-semibold text-gray-800 sticky left-0 z-10 text-sm sm:text-base whitespace-nowrap" style={{ minWidth: '6em' }}>
                              {evaluatedName}
                            </td>
                            {items.map(item => {
                              const evaluation = member[item.id]
                              return (
                                <td key={item.id} className="border border-gray-300 bg-white px-1 sm:px-2 py-1.5 sm:py-2 text-center">
                                  {evaluation ? (
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={evaluation.score}
                                      onChange={(e) => handleUpdateScore(evaluation.id, parseInt(e.target.value))}
                                      className="evaluation-input w-12 sm:w-16 px-1 sm:px-2 py-1.5 sm:py-2 border-2 border-gray-300 rounded text-center text-base sm:text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                                    />
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
        {Object.keys(byTeam).length === 0 && (
          <p className="text-gray-400 text-center py-8">評価データがありません</p>
        )}
      </div>
    </div>
  )
}
