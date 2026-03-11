'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { downloadCsv } from '@/lib/csv'

Chart.register(...registerables)

/** 横棒グラフのY軸ラベルを \n で改行して描画するプラグイン（スマホ用・左揃え） */
const multilineYLabelsPlugin = {
  id: 'multilineYLabels',
  afterDraw(chart: Chart) {
    const yScale = chart.scales.y
    if (!yScale || !yScale.ticks?.length) return
    const ticksOpts = yScale.options.ticks as { display?: boolean; font?: { size?: number }; color?: string }
    if (ticksOpts?.display !== false) return
    const fontSize = typeof ticksOpts?.font?.size === 'number' ? ticksOpts.font.size : 11
    const color = ticksOpts?.color ?? '#666'
    const ctx = chart.ctx
    ctx.save()
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    const lineHeight = fontSize + 2
    const labelLeftX = 8
    yScale.ticks.forEach((tick, i) => {
      const raw = (tick && typeof tick === 'object' && 'label' in tick ? (tick as { label?: string }).label : null) ?? (chart.data.labels as string[] | undefined)?.[i]
      const label = String(raw ?? '')
      const lines = label.split('\n')
      const y = yScale.getPixelForTick(i)
      const startY = y - ((lines.length - 1) * lineHeight) / 2
      lines.forEach((line, j) => {
        ctx.fillText(line.trim(), labelLeftX, startY + j * lineHeight)
      })
    })
    ctx.restore()
  },
}
Chart.register(multilineYLabelsPlugin)

interface SummaryItem {
  item_id: number
  major_category: string
  minor_category: string
  others_avg_score: number | null
  self_score: number | null
  count: number
  team_avg: number | null
}

const LINE_ALL = ''
const TAB_LOG_DEBOUNCE_MS = 2500
let lastTabLogTime = { summary: 0, monthly: 0 }

/** 文字列を指定文字数で折り返す（スマホ用ラベル） */
function wrapLabel(str: string, maxPerLine: number = 10): string {
  if (!str || str.length <= maxPerLine) return str
  const lines: string[] = []
  for (let i = 0; i < str.length; i += maxPerLine) {
    lines.push(str.slice(i, i + maxPerLine))
  }
  return lines.join('\n')
}

interface SummaryTabProps {
  isAdmin?: boolean
}

export default function SummaryTab({ isAdmin = false }: SummaryTabProps) {
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null)
  const [summaryYearMonth, setSummaryYearMonth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lineChartMajor, setLineChartMajor] = useState<string>(LINE_ALL)
  const [lineChartMinorId, setLineChartMinorId] = useState<number | null>(null)
  const [showDataLog, setShowDataLog] = useState(false)
  const lineChartRef = useRef<HTMLCanvasElement>(null)
  const radarChartRef = useRef<HTMLCanvasElement>(null)
  const lineChartContainerRef = useRef<HTMLDivElement>(null)
  const radarChartContainerRef = useRef<HTMLDivElement>(null)
  const lineChartInstance = useRef<Chart | null>(null)
  const radarChartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    loadSummary()
  }, [])

  // 利用者が集計タブを表示したことを記録（管理者は記録しない・二重送信を防ぐ）
  useEffect(() => {
    if (isAdmin) return
    const now = Date.now()
    if (now - lastTabLogTime.summary < TAB_LOG_DEBOUNCE_MS) return
    lastTabLogTime.summary = now
    fetch('/api/tab-view-log', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab: 'summary' }),
    }).catch(() => {})
  }, [isAdmin])

  // 折れ線用: 大項目で絞り → さらに中項目で絞り
  const lineChartFilteredSummary = (() => {
    let list = summary
    if (lineChartMajor !== LINE_ALL) {
      list = list.filter(s => s.major_category === lineChartMajor)
    }
    if (lineChartMinorId != null) {
      list = list.filter(s => s.item_id === lineChartMinorId)
    }
    return list
  })()
  const lineChartItemCount = lineChartFilteredSummary.length > 0 ? lineChartFilteredSummary.length : summary.length
  const isNarrowForHeight = typeof window !== 'undefined' && window.innerWidth < 768
  const lineChartMinHeightPx = Math.max(260, lineChartItemCount * (isNarrowForHeight ? 130 : 40))

  // 折れ線・レーダーチャート描画（スマホでコンテナサイズが0だと描画されないため、ResizeObserverでサイズ確定後に作成）
  useEffect(() => {
    if (summary.length === 0) return
    const forLine = lineChartFilteredSummary.length > 0 ? lineChartFilteredSummary : summary
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768
    const labels = forLine.map(item => {
      if (lineChartMinorId != null) return item.minor_category || ''
      if (isNarrow) {
        return wrapLabel((item.minor_category || '').trim(), 10)
      }
      return `${item.major_category || ''}\n${item.minor_category || ''}`
    })
    const othersData = forLine.map(item => item.others_avg_score ?? null)
    const selfData = forLine.map(item => item.self_score ?? null)
    const teamData = forLine.map(item => item.team_avg ?? null)

    const createLineChart = () => {
      if (!lineChartRef.current) return
      if (lineChartInstance.current) lineChartInstance.current.destroy()
      lineChartInstance.current = new Chart(lineChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '他者評価',
              data: othersData,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1,
            },
            {
              label: '自己評価',
              data: selfData,
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
              borderColor: 'rgb(168, 85, 247)',
              borderWidth: 1,
            },
            {
              label: 'チーム内平均',
              data: teamData,
              backgroundColor: 'rgba(34, 197, 94, 0.6)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
          layout: {
            padding: { left: isNarrow ? 110 : 8, right: 8, top: 0, bottom: 0 },
          },
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x != null ? ctx.parsed.x.toFixed(1) : '-'}点`,
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 1 },
              title: { display: true, text: '評価点（10点満点）' },
            },
            y: {
              title: { display: isNarrow ? false : true, text: '評価項目' },
              ticks: {
                display: !isNarrow,
                autoSkip: false,
                font: { size: isNarrow ? 11 : 11 },
                maxRotation: 0,
                minRotation: 0,
              },
              barPercentage: isNarrow ? 0.35 : 0.9,
              categoryPercentage: isNarrow ? 0.7 : 0.8,
            },
          },
        },
      })
    }

    let lineRo: ResizeObserver | null = null
    const lineContainer = lineChartContainerRef.current
    if (lineContainer && lineChartRef.current) {
      const rect = lineContainer.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) createLineChart()
      else {
        // スマホで初回はサイズが0のことがあるため、1フレーム後に再試行
        requestAnimationFrame(() => {
          const r = lineChartContainerRef.current?.getBoundingClientRect()
          if (r && r.width > 0 && r.height > 0 && !lineChartInstance.current) createLineChart()
        })
      }
      lineRo = new ResizeObserver(() => {
        const r = lineChartContainerRef.current?.getBoundingClientRect()
        if (r && r.width > 0 && r.height > 0) {
          if (lineChartInstance.current) lineChartInstance.current.resize()
          else createLineChart()
        }
      })
      lineRo.observe(lineContainer)
    }

    const majorMap: Record<string, { others: number[]; self: number[]; team: number[] }> = {}
    summary.forEach(item => {
      const major = item.major_category || '未分類'
      if (!majorMap[major]) majorMap[major] = { others: [], self: [], team: [] }
      if (item.others_avg_score != null) majorMap[major].others.push(item.others_avg_score)
      if (item.self_score != null) majorMap[major].self.push(item.self_score)
      if (item.team_avg != null) majorMap[major].team.push(item.team_avg)
    })
    const radarLabels = Object.keys(majorMap)
    const radarOthers = radarLabels.map(l =>
      majorMap[l].others.length ? majorMap[l].others.reduce((a, b) => a + b, 0) / majorMap[l].others.length : 0
    )
    const radarSelf = radarLabels.map(l =>
      majorMap[l].self.length ? majorMap[l].self.reduce((a, b) => a + b, 0) / majorMap[l].self.length : 0
    )
    const radarTeam = radarLabels.map(l =>
      majorMap[l].team.length ? majorMap[l].team.reduce((a, b) => a + b, 0) / majorMap[l].team.length : 0
    )

    const createRadarChart = () => {
      if (!radarChartRef.current) return
      if (radarChartInstance.current) radarChartInstance.current.destroy()
      radarChartInstance.current = new Chart(radarChartRef.current, {
        type: 'radar',
        data: {
          labels: radarLabels,
          datasets: [
            {
              label: '他者評価',
              data: radarOthers,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderWidth: 2,
              pointBackgroundColor: 'rgb(59, 130, 246)',
              pointRadius: 5,
            },
            {
              label: '自己評価',
              data: radarSelf,
              borderColor: 'rgb(168, 85, 247)',
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              borderWidth: 2,
              pointBackgroundColor: 'rgb(168, 85, 247)',
              pointRadius: 5,
            },
            {
              label: 'チーム内平均',
              data: radarTeam,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)}点`,
              },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 2 },
            },
          },
        },
      })
    }

    let radarRo: ResizeObserver | null = null
    const radarContainer = radarChartContainerRef.current
    if (radarContainer && radarChartRef.current) {
      const rect = radarContainer.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) createRadarChart()
      else {
        requestAnimationFrame(() => {
          const r = radarChartContainerRef.current?.getBoundingClientRect()
          if (r && r.width > 0 && r.height > 0 && !radarChartInstance.current) createRadarChart()
        })
      }
      radarRo = new ResizeObserver(() => {
        const r = radarChartContainerRef.current?.getBoundingClientRect()
        if (r && r.width > 0 && r.height > 0) {
          if (radarChartInstance.current) radarChartInstance.current.resize()
          else createRadarChart()
        }
      })
      radarRo.observe(radarContainer)
    }

    return () => {
      lineRo?.disconnect()
      radarRo?.disconnect()
      lineChartInstance.current?.destroy()
      radarChartInstance.current?.destroy()
    }
  }, [summary, lineChartMajor, lineChartMinorId])

  async function loadSummary() {
    try {
      setSummaryMessage(null)
      setSummaryYearMonth(null)
      const response = await fetch('/api/evaluations/summary', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSummaryMessage(data.message ?? null)
        setSummaryYearMonth(data.year_month ?? null)
        setSummary(data.summary.filter((item: SummaryItem) => item.others_avg_score !== null || item.self_score !== null))
      }
    } catch (error) {
      console.error('Failed to load summary:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleExportCsv() {
    const rows = (lineChartFilteredSummary.length > 0 ? lineChartFilteredSummary : summary).map(item => ({
      item_id: item.item_id,
      major_category: item.major_category ?? '',
      minor_category: item.minor_category ?? '',
      others_avg_score: item.others_avg_score ?? '',
      self_score: item.self_score ?? '',
      count: item.count,
      team_avg: item.team_avg ?? '',
    }))
    const headers = [
      { key: 'item_id', label: '項目ID' },
      { key: 'major_category', label: '大項目' },
      { key: 'minor_category', label: '中項目' },
      { key: 'others_avg_score', label: '他者評価平均' },
      { key: 'self_score', label: '自己評価' },
      { key: 'count', label: '評価数' },
      { key: 'team_avg', label: 'チーム平均' },
    ]
    downloadCsv(rows, headers, `集計_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (summary.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          <i className="fas fa-chart-bar mr-2"></i>あなたの評価結果
        </h2>
        <p className="text-gray-400 text-center py-8 text-sm sm:text-base">
          <i className="fas fa-info-circle mr-2"></i>
          {summaryMessage || 'まだ評価されていません'}
        </p>
      </div>
    )
  }

  const othersItems = summary.filter(item => item.others_avg_score !== null)
  const selfItems = summary.filter(item => item.self_score !== null)

  const othersTotalAvg = othersItems.length > 0
    ? (othersItems.reduce((sum, item) => sum + (item.others_avg_score || 0), 0) / othersItems.length).toFixed(1)
    : '-'
  const selfTotalAvg = selfItems.length > 0
    ? (selfItems.reduce((sum, item) => sum + (item.self_score || 0), 0) / selfItems.length).toFixed(1)
    : '-'
  const teamTotalAvg = (summary.reduce((sum, item) => sum + (item.team_avg || 0), 0) / summary.length).toFixed(1)

  const summaryPeriodLabel = summaryYearMonth
    ? `${summaryYearMonth.slice(0, 4)}年${parseInt(summaryYearMonth.slice(5, 7), 10)}月の結果`
    : '全期間の集計'

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
        <i className="fas fa-chart-bar mr-2"></i>あなたの評価結果
      </h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
        <i className="fas fa-info-circle mr-2"></i>
        <span className="font-medium text-gray-800">{summaryPeriodLabel}</span>
        <span className="ml-1">（他者評価と自己評価の比較）</span>
      </p>

      {/* 総合平均 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 sm:p-6">
          <div className="text-center">
            <div className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">他者評価の平均</div>
            <div className="text-3xl sm:text-5xl font-bold">
              {othersTotalAvg}
              {othersTotalAvg !== '-' && <span className="text-xl sm:text-2xl">点</span>}
            </div>
            <div className="text-xs sm:text-sm mt-2 opacity-90">
              {othersTotalAvg !== '-' ? '10点満点' : '評価なし'}
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 sm:p-6">
          <div className="text-center">
            <div className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">自己評価の平均</div>
            <div className="text-3xl sm:text-5xl font-bold">
              {selfTotalAvg}
              {selfTotalAvg !== '-' && <span className="text-xl sm:text-2xl">点</span>}
            </div>
            <div className="text-xs sm:text-sm mt-2 opacity-90">
              {selfTotalAvg !== '-' ? '10点満点' : '評価なし'}
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 sm:p-6">
          <div className="text-center">
            <div className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">チーム内平均</div>
            <div className="text-3xl sm:text-5xl font-bold">
              {teamTotalAvg}
              <span className="text-xl sm:text-2xl">点</span>
            </div>
            <div className="text-xs sm:text-sm mt-2 opacity-90">10点満点</div>
          </div>
        </div>
      </div>

      {/* 大項目別（レーダー） */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">
          <i className="fas fa-chart-area mr-2"></i>大項目別（レーダー）
        </h3>
        <div
          ref={radarChartContainerRef}
          className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 h-[280px] sm:h-[420px] w-full min-w-0 relative"
        >
          <canvas ref={radarChartRef} className="block" />
        </div>
      </div>

      {/* 項目別評価（横棒） */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">
          <i className="fas fa-chart-bar mr-2"></i>項目別評価（横棒）
        </h3>
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3">表示する項目を選択（大項目のみ＝その下の中項目すべて / 中項目まで選ぶ＝その項目のみ）</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end">
            <div className="w-full sm:min-w-[140px] sm:max-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">大項目</label>
              <select
                value={lineChartMajor}
                onChange={e => {
                  setLineChartMajor(e.target.value)
                  setLineChartMinorId(null)
                }}
                className="w-full border border-gray-300 rounded px-3 py-2.5 bg-white text-gray-800 text-base touch-manipulation"
              >
                <option value={LINE_ALL}>すべて</option>
                {[...new Set(summary.map(s => s.major_category))].filter(Boolean).sort().map(major => (
                  <option key={major} value={major}>{major}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:min-w-[140px] sm:max-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">中項目</label>
              <select
                value={lineChartMinorId ?? ''}
                onChange={e => setLineChartMinorId(e.target.value === '' ? null : Number(e.target.value))}
                disabled={lineChartMajor === LINE_ALL}
                className="w-full border border-gray-300 rounded px-3 py-2.5 bg-white text-gray-800 text-base touch-manipulation disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">すべて</option>
                {lineChartMajor !== LINE_ALL &&
                  summary
                    .filter(s => s.major_category === lineChartMajor)
                    .map(item => (
                      <option key={item.item_id} value={item.item_id}>{item.minor_category || ''}</option>
                    ))}
              </select>
            </div>
          </div>
        </div>
        <div
          className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            ref={lineChartContainerRef}
            className="w-full min-w-0 relative p-3 sm:p-4"
            style={{ height: lineChartMinHeightPx }}
          >
            <canvas ref={lineChartRef} className="block" />
          </div>
        </div>
      </div>

      {/* 評価表（上で選択した大項目・中項目で絞り込み表示） */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">
          <i className="fas fa-table mr-2"></i>項目別評価（詳細）
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-2">
          上で選択した大項目・中項目で絞り込んでいます。
        </p>
        <div className="overflow-x-auto -mx-3 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="min-w-full border-collapse border border-gray-300 text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-base whitespace-nowrap" style={{ minWidth: '8em' }}>大項目</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-base">中項目</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-base whitespace-nowrap" style={{ minWidth: '3em' }}>他者</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-base whitespace-nowrap" style={{ minWidth: '3em' }}>自己</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-base whitespace-nowrap" style={{ minWidth: '4.5em' }}>チーム平均</th>
              </tr>
            </thead>
            <tbody>
              {(lineChartFilteredSummary.length > 0 ? lineChartFilteredSummary : summary).map(item => {
                const othersScore = item.others_avg_score
                const selfScore = item.self_score
                const teamAvg = item.team_avg || 0

                return (
                  <tr key={item.item_id} className="hover:bg-blue-50">
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 font-semibold table-cell-text text-xs sm:text-base whitespace-nowrap" style={{ minWidth: '8em' }}>{item.major_category || ''}</td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 table-cell-text text-xs sm:text-base">{item.minor_category || ''}</td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap" style={{ minWidth: '4em' }}>
                      {othersScore !== null ? (
                        <span className="whitespace-nowrap"><span className="text-lg sm:text-2xl font-bold text-blue-600">{othersScore.toFixed(1)}</span><span className="text-xs sm:text-sm text-gray-600">点</span></span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap" style={{ minWidth: '4em' }}>
                      {selfScore !== null ? (
                        <span className="whitespace-nowrap"><span className="text-base sm:text-xl font-bold text-purple-600">{selfScore.toFixed(1)}</span><span className="text-xs sm:text-sm text-gray-600">点</span></span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap" style={{ minWidth: '4.5em' }}>
                      <span className="text-base sm:text-lg font-bold text-gray-700">{teamAvg.toFixed(1)}</span>
                      <span className="text-xs sm:text-sm text-gray-600">点</span>
                    </td>
                  </tr>
                )
              })}
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
                {JSON.stringify(
                  lineChartFilteredSummary.length > 0 ? lineChartFilteredSummary : summary,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
