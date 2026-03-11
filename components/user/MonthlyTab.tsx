'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { downloadCsv } from '@/lib/csv'

Chart.register(...registerables)

interface MonthlyData {
  year_month: string
  item_id: number
  major_category: string
  minor_category: string
  avg_score: number | null
  count: number
  self_score: number | null
}

interface MonthlyTabProps {
  isAdmin?: boolean
}

export default function MonthlyTab({ isAdmin = false }: MonthlyTabProps) {
  const [periods, setPeriods] = useState<{ year_month: string }[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMajor, setSelectedMajor] = useState<string>('')
  const [selectedMinorItemId, setSelectedMinorItemId] = useState<number | null>(null)
  const [showDataLog, setShowDataLog] = useState(false)
  const avgChartRef = useRef<HTMLCanvasElement>(null)
  const itemsChartRef = useRef<HTMLCanvasElement>(null)
  const itemsChartSectionRef = useRef<HTMLDivElement>(null)
  const detailTableRef = useRef<HTMLDivElement>(null)
  const avgChartInstance = useRef<Chart | null>(null)
  const itemsChartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    loadMonthlyData()
  }, [])

  // 初回ロード時: 大項目・中項目の初期値
  useEffect(() => {
    if (monthlyData.length === 0) return
    const itemMap: Record<number, { id: number; major: string; minor: string }> = {}
    monthlyData.forEach(data => {
      if (!itemMap[data.item_id]) {
        itemMap[data.item_id] = {
          id: data.item_id,
          major: data.major_category,
          minor: data.minor_category,
        }
      }
    })
    const itemsList = Object.values(itemMap)
    if (itemsList.length === 0) return
    setSelectedMajor(prev => (prev === '' ? itemsList[0].major : prev))
    setSelectedMinorItemId(prev => (prev === null ? itemsList[0].id : prev))
  }, [monthlyData])

  // グラフ描画（フックは常に同じ順で呼ぶため、早期 return の前に配置）
  useEffect(() => {
    if (periods.length === 0 || monthlyData.length === 0) return
    const itemMap: Record<number, { id: number; major: string; minor: string; othersMonths: Record<string, string>; selfMonths: Record<string, string> }> = {}
    monthlyData.forEach(data => {
      if (!itemMap[data.item_id]) {
        itemMap[data.item_id] = {
          id: data.item_id,
          major: data.major_category,
          minor: data.minor_category,
          othersMonths: {},
          selfMonths: {},
        }
      }
      if (data.avg_score !== null) itemMap[data.item_id].othersMonths[data.year_month] = data.avg_score.toFixed(1)
      if (data.self_score !== null) itemMap[data.item_id].selfMonths[data.year_month] = data.self_score.toFixed(1)
    })
    const items = Object.values(itemMap)
    const order = [...periods].reverse()
    const labels = order.map(p => p.year_month)
    const othersAvg = order.map(p => {
      const withData = items.filter(item => item.othersMonths[p.year_month])
      if (withData.length === 0) return null
      return withData.reduce((sum, item) => sum + parseFloat(item.othersMonths[p.year_month]), 0) / withData.length
    })
    const selfAvg = order.map(p => {
      const withData = items.filter(item => item.selfMonths[p.year_month])
      if (withData.length === 0) return null
      return withData.reduce((sum, item) => sum + parseFloat(item.selfMonths[p.year_month]), 0) / withData.length
    })

    if (avgChartRef.current) {
      if (avgChartInstance.current) avgChartInstance.current.destroy()
      avgChartInstance.current = new Chart(avgChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '他者評価の平均', data: othersAvg, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, pointBackgroundColor: 'rgb(59, 130, 246)', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 6, pointHoverRadius: 8, tension: 0.3, fill: true },
            { label: '自己評価の平均', data: selfAvg, borderColor: 'rgb(168, 85, 247)', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderWidth: 3, pointBackgroundColor: 'rgb(168, 85, 247)', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 6, pointHoverRadius: 8, tension: 0.3, fill: true },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : '-'}点` } },
          },
          scales: {
            y: { beginAtZero: true, max: 10, ticks: { stepSize: 1 }, title: { display: true, text: '評価点（10点満点）' } },
            x: { title: { display: true, text: '年月' }, ticks: { maxRotation: 45, minRotation: 35, maxTicksLimit: 12, font: { size: 11 } } },
          },
        },
      })
    }

    const itemsToShow = selectedMinorItemId != null ? items.filter(item => item.id === selectedMinorItemId) : []
    const colors = ['rgb(59, 130, 246)', 'rgb(16, 185, 129)', 'rgb(245, 158, 11)', 'rgb(239, 68, 68)', 'rgb(139, 92, 246)', 'rgb(236, 72, 153)', 'rgb(20, 184, 166)']
    if (itemsChartRef.current) {
      if (itemsChartInstance.current) itemsChartInstance.current.destroy()
      itemsChartInstance.current = new Chart(itemsChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: itemsToShow.map((item, i) => ({
            label: `${item.major} - ${item.minor}`.slice(0, 20),
            data: order.map(p => (item.othersMonths[p.year_month] ? parseFloat(item.othersMonths[p.year_month]) : null)),
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : '-'}点` } },
          },
          scales: {
            y: { beginAtZero: true, max: 10, ticks: { stepSize: 1 }, title: { display: true, text: '評価点（10点満点）' } },
            x: { title: { display: true, text: '年月' }, ticks: { maxRotation: 45, minRotation: 35, maxTicksLimit: 12, font: { size: 11 } } },
          },
        },
      })
    }
    return () => {
      avgChartInstance.current?.destroy()
      itemsChartInstance.current?.destroy()
    }
  }, [periods, monthlyData, selectedMinorItemId])

  async function loadMonthlyData() {
    try {
      const response = await fetch('/api/evaluations/monthly', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setPeriods(data.periods || [])
        setMonthlyData(data.monthlyData || [])
      }
    } catch (error) {
      console.error('Failed to load monthly data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleExportCsv() {
    const rows = monthlyData.map(d => ({
      year_month: d.year_month,
      item_id: d.item_id,
      major_category: d.major_category ?? '',
      minor_category: d.minor_category ?? '',
      avg_score: d.avg_score ?? '',
      count: d.count,
      self_score: d.self_score ?? '',
    }))
    const headers = [
      { key: 'year_month', label: '年月' },
      { key: 'item_id', label: '項目ID' },
      { key: 'major_category', label: '大項目' },
      { key: 'minor_category', label: '中項目' },
      { key: 'avg_score', label: '他者評価平均' },
      { key: 'count', label: '評価数' },
      { key: 'self_score', label: '自己評価' },
    ]
    downloadCsv(rows, headers, `月次_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          <i className="fas fa-calendar-alt mr-2"></i>あなたの評価推移
        </h2>
        <p className="text-gray-400 text-center py-8 text-sm sm:text-base">
          <i className="fas fa-info-circle mr-2"></i>まだ評価データがありません
        </p>
      </div>
    )
  }

  // データを整形
  const itemMap: Record<number, {
    id: number
    major: string
    minor: string
    othersMonths: Record<string, string>
    selfMonths: Record<string, string>
  }> = {}

  monthlyData.forEach(data => {
    if (!itemMap[data.item_id]) {
      itemMap[data.item_id] = {
        id: data.item_id,
        major: data.major_category,
        minor: data.minor_category,
        othersMonths: {},
        selfMonths: {},
      }
    }
    if (data.avg_score !== null) {
      itemMap[data.item_id].othersMonths[data.year_month] = data.avg_score.toFixed(1)
    }
    if (data.self_score !== null) {
      itemMap[data.item_id].selfMonths[data.year_month] = data.self_score.toFixed(1)
    }
  })

  const items = Object.values(itemMap)

  // 総合平均（月別）・前月比
  const periodOrder = [...periods].reverse()
  const othersAvgByPeriod = periodOrder.map(p => {
    const withData = items.filter(item => item.othersMonths[p.year_month])
    if (withData.length === 0) return null
    return withData.reduce((sum, item) => sum + parseFloat(item.othersMonths[p.year_month]), 0) / withData.length
  })
  const selfAvgByPeriod = periodOrder.map(p => {
    const withData = items.filter(item => item.selfMonths[p.year_month])
    if (withData.length === 0) return null
    return withData.reduce((sum, item) => sum + parseFloat(item.selfMonths[p.year_month]), 0) / withData.length
  })
  const latestOthers = othersAvgByPeriod[periodOrder.length - 1]
  const prevOthers = periodOrder.length >= 2 ? othersAvgByPeriod[periodOrder.length - 2] : null
  const latestSelf = selfAvgByPeriod[periodOrder.length - 1]
  const prevSelf = periodOrder.length >= 2 ? selfAvgByPeriod[periodOrder.length - 2] : null
  const othersDiff = latestOthers != null && prevOthers != null ? latestOthers - prevOthers : null
  const selfDiff = latestSelf != null && prevSelf != null ? latestSelf - prevSelf : null

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
        <i className="fas fa-calendar-alt mr-2"></i>あなたの評価推移
      </h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
        <i className="fas fa-info-circle mr-2"></i>過去の評価結果と比較できます
      </p>

      {/* 前月比サマリー */}
      {periods.length >= 2 && (othersDiff != null || selfDiff != null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
            <span className="text-gray-700 font-medium">他者評価の推移</span>
            {othersDiff != null && (
              <span
                className={
                  othersDiff > 0
                    ? 'text-green-600 font-bold flex items-center gap-1'
                    : othersDiff < 0
                      ? 'text-red-600 font-bold flex items-center gap-1'
                      : 'text-gray-600 font-bold flex items-center gap-1'
                }
              >
                {othersDiff > 0 && <i className="fas fa-arrow-trend-up" />}
                {othersDiff < 0 && <i className="fas fa-arrow-trend-down" />}
                {othersDiff === 0 && <i className="fas fa-minus" />}
                {othersDiff > 0 ? ` +${othersDiff.toFixed(1)}点 上昇` : othersDiff < 0 ? ` ${othersDiff.toFixed(1)}点 低下` : ' 横ばい'}
              </span>
            )}
          </div>
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
            <span className="text-gray-700 font-medium">自己評価の推移</span>
            {selfDiff != null && (
              <span
                className={
                  selfDiff > 0
                    ? 'text-green-600 font-bold flex items-center gap-1'
                    : selfDiff < 0
                      ? 'text-red-600 font-bold flex items-center gap-1'
                      : 'text-gray-600 font-bold flex items-center gap-1'
                }
              >
                {selfDiff > 0 && <i className="fas fa-arrow-trend-up" />}
                {selfDiff < 0 && <i className="fas fa-arrow-trend-down" />}
                {selfDiff === 0 && <i className="fas fa-minus" />}
                {selfDiff > 0 ? ` +${selfDiff.toFixed(1)}点 上昇` : selfDiff < 0 ? ` ${selfDiff.toFixed(1)}点 低下` : ' 横ばい'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 総合平均の推移グラフ */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">
          <i className="fas fa-chart-line mr-2"></i>総合平均の推移
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 h-[260px] sm:h-[300px] min-h-[200px]">
          <canvas ref={avgChartRef} />
        </div>
      </div>

      {/* 項目別推移グラフ（大項目・中項目プルダウンで選択） */}
      <div ref={itemsChartSectionRef} className="mb-4 sm:mb-6 scroll-mt-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">
          <i className="fas fa-chart-line mr-2"></i>項目別評価の推移
        </h3>
        <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3">表示する項目を選択</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end">
            <div className="w-full sm:min-w-[140px] sm:max-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">大項目</label>
              <select
                value={selectedMajor || items[0]?.major || ''}
                onChange={e => {
                  const major = e.target.value
                  setSelectedMajor(major)
                  const inMajor = items.filter(i => i.major === major)
                  setSelectedMinorItemId(inMajor.length > 0 ? inMajor[0].id : null)
                }}
                className="w-full border border-gray-300 rounded px-3 py-2.5 bg-white text-gray-800 text-base touch-manipulation"
              >
                {[...new Set(items.map(i => i.major))].map(major => (
                  <option key={major} value={major}>{major}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:min-w-[180px] sm:max-w-[280px]">
              <label className="block text-xs text-gray-500 mb-1">中項目</label>
              <select
                value={selectedMinorItemId ?? items.filter(i => i.major === (selectedMajor || items[0]?.major))[0]?.id ?? ''}
                onChange={e => setSelectedMinorItemId(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2.5 bg-white text-gray-800 text-base touch-manipulation"
              >
                {items
                  .filter(i => i.major === (selectedMajor || items[0]?.major))
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.minor}
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedMinorItemId != null) {
                  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768
                  const rowId = isNarrow ? `detail-row-${selectedMinorItemId}` : `detail-row-pc-${selectedMinorItemId}`
                  const rowEl = document.getElementById(rowId)
                  if (rowEl) {
                    rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    return
                  }
                }
                detailTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium shrink-0"
            >
              <i className="fas fa-arrow-down mr-1"></i>詳細へ
            </button>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 h-[320px] sm:h-[400px] min-h-[240px]">
          <canvas ref={itemsChartRef} />
        </div>
      </div>

      {/* 詳細データ表（「グラフへ」バーは画面上部に固定） */}
      <div ref={detailTableRef} className="scroll-mt-4">
        <div
          className="flex flex-wrap items-center justify-between gap-3 py-3 mb-3 sm:mb-4 bg-white border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0 sm:border-0"
          style={{ position: 'sticky', top: '3.5rem', zIndex: 20 }}
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-700">
            <i className="fas fa-table mr-2"></i>項目別評価の推移（詳細）
          </h3>
          <button
            type="button"
            onClick={() => itemsChartSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium shadow-sm"
          >
            <i className="fas fa-arrow-up mr-1"></i>グラフへ
          </button>
        </div>
        {/* スマホ: 月度を縦並びのカード表示（横スクロール不要） */}
        <div className="md:hidden space-y-4">
          {items.map(item => (
            <div key={item.id} id={`detail-row-${item.id}`} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="px-3 py-2.5 bg-gray-100 border-b border-gray-200">
                <div className="font-semibold text-gray-800 text-sm">{item.major}</div>
                <div className="text-xs text-gray-600 mt-0.5">{item.minor}</div>
              </div>
              <div className="divide-y divide-gray-100">
                {periods.map((p, colIndex) => {
                  const othersScore = item.othersMonths[p.year_month] || '-'
                  const selfScore = item.selfMonths[p.year_month] || '-'
                  const prevPeriod = periods[colIndex + 1]
                  const prevOthers = prevPeriod ? item.othersMonths[prevPeriod.year_month] : null
                  let trendIcon = null
                  if (othersScore !== '-' && prevOthers) {
                    const curr = parseFloat(othersScore)
                    const prev = parseFloat(prevOthers)
                    const diff = curr - prev
                    if (diff > 0) trendIcon = <i className="fas fa-arrow-up text-green-600 ml-1 text-xs" />
                    else if (diff < 0) trendIcon = <i className="fas fa-arrow-down text-red-600 ml-1 text-xs" />
                    else trendIcon = <i className="fas fa-minus text-gray-400 ml-1 text-xs" />
                  }
                  return (
                    <div key={p.year_month} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <span className="font-medium text-gray-800 shrink-0 min-w-[4.25rem] whitespace-nowrap">{p.year_month}</span>
                      <div className="flex items-center gap-3 justify-end min-w-0 shrink min-h-[1.5em]">
                        <span className="text-blue-600 font-semibold shrink-0 inline-flex items-baseline gap-0.5 whitespace-nowrap">
                          <span>他者:</span>
                          <span className="w-10 sm:w-12 text-right tabular-nums">{othersScore}{othersScore !== '-' ? '点' : ''}</span>
                        </span>
                        <span className="inline-flex items-center justify-center w-5 shrink-0 text-center" aria-hidden>{trendIcon}</span>
                        <span className="text-purple-600 font-semibold shrink-0 inline-flex items-baseline gap-0.5 whitespace-nowrap">
                          <span>自己:</span>
                          <span className="w-10 sm:w-12 text-right tabular-nums">{selfScore}{selfScore !== '-' ? '点' : ''}</span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* PC: 表（横スクロールあり） */}
        <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="min-w-full border-collapse border border-gray-300 text-sm sm:text-base">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-left sticky left-0 z-10 text-xs sm:text-base whitespace-nowrap" style={{ minWidth: '8em' }}>
                  評価項目
                </th>
                {periods.map((p) => (
                  <th key={p.year_month} className="border border-gray-300 bg-blue-700 text-white px-2 sm:px-4 py-2 sm:py-3 text-center min-w-[72px] sm:min-w-[120px] text-xs sm:text-base">
                    {p.year_month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} id={`detail-row-pc-${item.id}`} className="hover:bg-blue-50 scroll-mt-24">
                  <td className="border border-gray-300 bg-white px-4 py-3 sticky left-0 z-10 whitespace-nowrap" style={{ minWidth: '8em' }}>
                    <div className="result-major-category">{item.major}</div>
                    <div className="result-minor-category">{item.minor}</div>
                  </td>
                  {periods.map((p, colIndex) => {
                    const othersScore = item.othersMonths[p.year_month] || '-'
                    const selfScore = item.selfMonths[p.year_month] || '-'
                    const prevPeriod = periods[colIndex + 1]
                    const prevOthers = prevPeriod ? item.othersMonths[prevPeriod.year_month] : null
                    let trendIcon = null
                    if (othersScore !== '-' && prevOthers) {
                      const curr = parseFloat(othersScore)
                      const prev = parseFloat(prevOthers)
                      const diff = curr - prev
                      if (diff > 0) {
                        trendIcon = <i className="fas fa-arrow-up text-green-600 ml-1 text-sm" title={`前月比 +${diff.toFixed(1)}点 上昇`} />
                      } else if (diff < 0) {
                        trendIcon = <i className="fas fa-arrow-down text-red-600 ml-1 text-sm" title={`前月比 ${diff.toFixed(1)}点 低下`} />
                      } else {
                        trendIcon = <i className="fas fa-minus text-gray-400 ml-1 text-sm" title="前月と同じ" />
                      }
                    }
                    return (
                      <td key={p.year_month} className="border border-gray-300 bg-white px-4 py-3 text-center">
                        <div className="mb-1 flex items-center justify-center flex-wrap gap-0.5">
                          <span className="text-xs text-gray-500">他者:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {othersScore}{othersScore !== '-' ? '点' : ''}
                          </span>
                          {trendIcon}
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">自己:</span>
                          <span className="text-sm font-semibold text-purple-600">
                            {selfScore}{selfScore !== '-' ? '点' : ''}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* データログ・CSV出力（管理者のみ） */}
      {isAdmin && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">
            <i className="fas fa-file-alt mr-2"></i>データログ・CSV出力
          </h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-3">
            <button
              type="button"
              onClick={() => setShowDataLog(prev => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              <i className={`fas fa-${showDataLog ? 'chevron-up' : 'chevron-down'}`}></i>
              {showDataLog ? 'ログを閉じる' : 'ログを表示'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
            >
              <i className="fas fa-file-csv"></i>
              CSV出力
            </button>
          </div>
          {showDataLog && (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-[400px]">
              <pre className="text-xs sm:text-sm whitespace-pre-wrap break-all">
                {JSON.stringify(monthlyData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
