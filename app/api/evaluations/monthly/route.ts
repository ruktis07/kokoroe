import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getAdjustedYearMonths } from '@/lib/adjusted-year-months'

export async function GET() {
  try {
    const currentUser = await requireAuth()

    const adjustedSet = new Set(await getAdjustedYearMonths())
    // チーム間調整を実行した月が1件もない場合は、利用者に月次結果を表示しない
    if (adjustedSet.size === 0) {
      return NextResponse.json({
        periods: [],
        monthlyData: [],
        message: '表示できる推移データがありません。管理者が採点調整（チーム間調整）を実行すると表示されます。',
      })
    }

    // 利用可能な年月一覧を取得（自分が評価された月）
    const periods = await prisma.evaluation.findMany({
      where: {
        evaluatedId: currentUser.id,
        yearMonth: { not: null },
      },
      select: {
        yearMonth: true,
      },
      distinct: ['yearMonth'],
      orderBy: {
        yearMonth: 'desc',
      },
    })

    let yearMonths = periods.map(p => p.yearMonth).filter(Boolean) as string[]

    // グラフは前月まで表示（当月を除外）
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    yearMonths = yearMonths.filter(ym => ym < currentYearMonth)

    // チーム間調整済みが1件以上ある場合のみ、調整済みの月だけ表示（未調整の月は非表示）
    if (adjustedSet.size > 0) {
      yearMonths = yearMonths.filter(ym => adjustedSet.has(ym))
    }

    // 各年月の他者評価データを取得（自己評価を除外）
    const othersData = await prisma.evaluation.groupBy({
      by: ['yearMonth', 'itemId'],
      where: {
        evaluatedId: currentUser.id,
        evaluatorId: { not: currentUser.id },
        yearMonth: { not: null },
      },
      _avg: {
        score: true,
      },
      _count: {
        score: true,
      },
    })

    // 各年月の自己評価データを取得
    const selfData = await prisma.evaluation.groupBy({
      by: ['yearMonth', 'itemId'],
      where: {
        evaluatedId: currentUser.id,
        evaluatorId: currentUser.id,
        yearMonth: { not: null },
      },
      _avg: {
        score: true,
      },
    })

    // 評価項目を取得
    const items = await prisma.evaluationItem.findMany({
      orderBy: { displayOrder: 'asc' },
    })

    // データを整形
    const selfScoreMap = new Map(
      selfData.map(s => [`${s.yearMonth}_${s.itemId}`, s._avg.score])
    )

    // 0.1単位の他者スコア調整を取得（失敗時は空で続行）
    let adjustmentMap = new Map<string, number>()
    try {
      const adjustments = await prisma.othersScoreAdjustment.findMany({
        where: { memberId: currentUser.id },
      })
      adjustmentMap = new Map(
        adjustments.map(a => [`${a.yearMonth}_${a.itemId}`, a.adjustedScore])
      )
    } catch {
      // テーブル未作成・Prisma未再生成時は調整なし
    }

    let monthlyData = othersData.map(item => {
      const key = `${item.yearMonth}_${item.itemId}`
      const avg_score = adjustmentMap.has(key)
        ? adjustmentMap.get(key)!
        : item._avg.score

      return {
        year_month: item.yearMonth,
        item_id: item.itemId,
        major_category: items.find(i => i.id === item.itemId)?.majorCategory || '',
        minor_category: items.find(i => i.id === item.itemId)?.minorCategory || '',
        avg_score,
        count: item._count.score,
        self_score: selfScoreMap.get(`${item.yearMonth}_${item.itemId}`) || null,
      }
    })

    monthlyData = monthlyData.filter(d => d.year_month != null && d.year_month < currentYearMonth)
    if (adjustedSet.size > 0) {
      monthlyData = monthlyData.filter(d => d.year_month != null && adjustedSet.has(d.year_month))
    }

    return NextResponse.json({
      periods: yearMonths.map(ym => ({ year_month: ym })),
      monthlyData,
    })
  } catch (error: any) {
    if (error.message === '認証が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}
