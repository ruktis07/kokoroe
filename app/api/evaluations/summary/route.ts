import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getAdjustedYearMonths } from '@/lib/adjusted-year-months'

export async function GET() {
  try {
    const currentUser = await requireAuth()

    const adjustedMonths = await getAdjustedYearMonths()
    const useAdjustedOnly = adjustedMonths.length > 0

    const items = await prisma.evaluationItem.findMany({
      orderBy: { displayOrder: 'asc' },
    })

    if (useAdjustedOnly) {
      const myYearMonths = await prisma.evaluation.findMany({
        where: {
          evaluatedId: currentUser.id,
          yearMonth: { not: null },
        },
        select: { yearMonth: true },
        distinct: ['yearMonth'],
      })
      const myMonths = myYearMonths.map(r => r.yearMonth).filter((ym): ym is string => ym != null)
      const targetYearMonth = adjustedMonths.find(ym => myMonths.includes(ym)) ?? null
      if (!targetYearMonth) {
        return NextResponse.json({ summary: [], message: '表示できる集計結果がありません。' })
      }

      const adjustments = await prisma.othersScoreAdjustment.findMany({
        where: { memberId: currentUser.id, yearMonth: targetYearMonth },
      })
      const othersScoreMap = new Map(adjustments.map(a => [a.itemId, a.adjustedScore]))

      const selfEvals = await prisma.evaluation.findMany({
        where: {
          evaluatedId: currentUser.id,
          evaluatorId: currentUser.id,
          yearMonth: targetYearMonth,
        },
      })
      const selfScoreMap = new Map(selfEvals.map(e => [e.itemId, e.score]))

      const othersCount = await prisma.evaluation.groupBy({
        by: ['itemId'],
        where: {
          evaluatedId: currentUser.id,
          evaluatorId: { not: currentUser.id },
          yearMonth: targetYearMonth,
        },
        _count: { score: true },
      })
      const countMap = new Map(othersCount.map(c => [c.itemId, c._count.score]))

      const teamMembers = await prisma.member.findMany({
        where: { team: currentUser.team, role: 'user' },
      })
      const teamMemberIds = teamMembers.map(m => m.id)
      const teamAdjustments = teamMemberIds.length > 0
        ? await prisma.othersScoreAdjustment.findMany({
            where: {
              memberId: { in: teamMemberIds },
              yearMonth: targetYearMonth,
            },
          })
        : []
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
    }

    // 調整済みが1件もない場合は従来どおり全期間で集計（テストデータなどが表示される）
    const othersScores = await prisma.evaluation.groupBy({
      by: ['itemId'],
      where: {
        evaluatedId: currentUser.id,
        evaluatorId: { not: currentUser.id },
      },
      _avg: { score: true },
      _count: { score: true },
    })

    const selfScores = await prisma.evaluation.groupBy({
      by: ['itemId'],
      where: {
        evaluatedId: currentUser.id,
        evaluatorId: currentUser.id,
      },
      _avg: { score: true },
    })

    const teamMembers = await prisma.member.findMany({
      where: { team: currentUser.team, role: 'user' },
    })
    const teamMemberIds = teamMembers.map(m => m.id)

    const teamScores = teamMemberIds.length > 0
      ? await prisma.$queryRaw<{ evaluated_id: number; item_id: number; avg_score: number }[]>`
          SELECT evaluated_id AS evaluated_id, item_id AS item_id, AVG(score)::float AS avg_score
          FROM evaluations
          WHERE evaluated_id IN (${Prisma.join(teamMemberIds)})
            AND evaluator_id != evaluated_id
          GROUP BY evaluated_id, item_id
        `
      : []

    const selfScoreMap = new Map(selfScores.map(s => [s.itemId, s._avg.score]))

    const teamScoreMap = new Map<string, number[]>()
    teamScores.forEach(ts => {
      const key = `${ts.item_id}`
      if (!teamScoreMap.has(key)) teamScoreMap.set(key, [])
      teamScoreMap.get(key)!.push(ts.avg_score ?? 0)
    })

    const summary = items.map(item => {
      const othersData = othersScores.find(s => s.itemId === item.id)
      const othersAvg = othersData?._avg.score || null
      const selfScore = selfScoreMap.get(item.id) || null
      const teamScoresForItem = teamScoreMap.get(item.id.toString()) || []
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
        count: othersData?._count.score || 0,
        team_avg: teamAvg,
      }
    })

    return NextResponse.json({ summary, year_month: null })
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
