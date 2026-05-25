import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getAdjustedYearMonths } from '@/lib/adjusted-year-months'

export async function GET() {
  try {
    const currentUser = await requireAuth()

    // 互いに依存しない初期データを並列で取得
    // 旧実装は直列で 7〜8 回 DB を往復していたが、並列化で 2 フェーズに圧縮
    const [adjustedMonths, items, myYearMonthsRaw, teamMembers] = await Promise.all([
      getAdjustedYearMonths(),
      prisma.evaluationItem.findMany({
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.evaluation.findMany({
        where: {
          evaluatedId: currentUser.id,
          yearMonth: { not: null },
        },
        select: { yearMonth: true },
        distinct: ['yearMonth'],
      }),
      prisma.member.findMany({
        where: { team: currentUser.team, role: 'user' },
      }),
    ])

    // チーム間調整を実行した月が1件もない場合は、利用者に結果を表示しない
    if (adjustedMonths.length === 0) {
      return NextResponse.json({
        summary: [],
        message: '表示できる集計結果がありません。',
      })
    }

    const myMonths = myYearMonthsRaw
      .map(r => r.yearMonth)
      .filter((ym): ym is string => ym != null)
    const targetYearMonth = adjustedMonths.find(ym => myMonths.includes(ym)) ?? null
    if (!targetYearMonth) {
      return NextResponse.json({ summary: [], message: '表示できる集計結果がありません。' })
    }

    const teamMemberIds = teamMembers.map(m => m.id)

    // targetYearMonth が決まったあとに必要なクエリも並列で取得
    const [adjustments, selfEvals, othersCount, teamAdjustments] = await Promise.all([
      prisma.othersScoreAdjustment.findMany({
        where: { memberId: currentUser.id, yearMonth: targetYearMonth },
      }),
      prisma.evaluation.findMany({
        where: {
          evaluatedId: currentUser.id,
          evaluatorId: currentUser.id,
          yearMonth: targetYearMonth,
        },
      }),
      prisma.evaluation.groupBy({
        by: ['itemId'],
        where: {
          evaluatedId: currentUser.id,
          evaluatorId: { not: currentUser.id },
          yearMonth: targetYearMonth,
        },
        _count: { score: true },
      }),
      teamMemberIds.length > 0
        ? prisma.othersScoreAdjustment.findMany({
            where: {
              memberId: { in: teamMemberIds },
              yearMonth: targetYearMonth,
            },
          })
        : Promise.resolve([] as { itemId: number; adjustedScore: number }[]),
    ])

    const othersScoreMap = new Map(adjustments.map(a => [a.itemId, a.adjustedScore]))
    const selfScoreMap = new Map(selfEvals.map(e => [e.itemId, e.score]))
    const countMap = new Map(othersCount.map(c => [c.itemId, c._count.score]))
    const teamScoreMap = new Map<number, number[]>()
    teamAdjustments.forEach(a => {
      if (!teamScoreMap.has(a.itemId)) teamScoreMap.set(a.itemId, [])
      teamScoreMap.get(a.itemId)!.push(a.adjustedScore)
    })

    const summary = items.map(item => {
      const othersAvg = othersScoreMap.get(item.id) ?? null
      const selfScore = selfScoreMap.get(item.id) ?? null
      const teamScoresForItem = teamScoreMap.get(item.id) ?? []
      const teamAvg =
        teamScoresForItem.length > 0
          ? teamScoresForItem.reduce((a, b) => a + b, 0) / teamScoresForItem.length
          : null

      return {
        item_id: item.id,
        major_category: item.majorCategory,
        minor_category: item.minorCategory,
        others_avg_score: othersAvg,
        self_score: selfScore,
        count: countMap.get(item.id) ?? 0,
        team_avg: teamAvg,
      }
    })

    return NextResponse.json({ summary, year_month: targetYearMonth })
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
