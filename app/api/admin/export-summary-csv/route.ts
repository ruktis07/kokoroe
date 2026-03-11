import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const yearMonth = searchParams.get('year_month') || new Date().toISOString().slice(0, 7)

    // 集計データを取得
    const evaluations = await prisma.evaluation.findMany({
      where: {
        yearMonth,
      },
      include: {
        evaluated: {
          select: {
            name: true,
            team: true,
            role: true,
          },
        },
        item: {
          select: {
            majorCategory: true,
            minorCategory: true,
            displayOrder: true,
          },
        },
      },
    })

    // 集計処理
    const summaryMap = new Map<string, {
      name: string
      team: string | null
      majorCategory: string
      minorCategory: string
      othersScores: number[]
      selfScores: number[]
    }>()

    evaluations.forEach(ev => {
      if (ev.evaluated.role !== 'user') return

      const key = `${ev.evaluatedId}_${ev.itemId}`
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          name: ev.evaluated.name,
          team: ev.evaluated.team,
          majorCategory: ev.item.majorCategory,
          minorCategory: ev.item.minorCategory,
          othersScores: [],
          selfScores: [],
        })
      }

      const summary = summaryMap.get(key)!
      if (ev.evaluatorId === ev.evaluatedId) {
        summary.selfScores.push(ev.score)
      } else {
        summary.othersScores.push(ev.score)
      }
    })

    // CSVヘッダー
    let csv = '\uFEFF' // BOM for Excel
    csv += '氏名,チーム,大項目,中項目,他者評価平均,自己評価,評価件数\n'

    // データ行
    Array.from(summaryMap.values())
      .sort((a, b) => {
        if (a.team !== b.team) return (a.team || '').localeCompare(b.team || '')
        return a.name.localeCompare(b.name)
      })
      .forEach(summary => {
        const othersAvg = summary.othersScores.length > 0
          ? (summary.othersScores.reduce((a, b) => a + b, 0) / summary.othersScores.length).toFixed(2)
          : ''
        const selfAvg = summary.selfScores.length > 0
          ? (summary.selfScores.reduce((a, b) => a + b, 0) / summary.selfScores.length).toFixed(2)
          : ''
        const count = summary.othersScores.length

        csv += `"${summary.name}","${summary.team || ''}","${summary.majorCategory}","${summary.minorCategory}",${othersAvg},${selfAvg},${count}\n`
      })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="summary_${yearMonth}.csv"`,
      },
    })
  } catch (error: any) {
    if (error.message === '認証が必要です' || error.message === '管理者権限が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('管理者') ? 403 : 401 }
      )
    }
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}
