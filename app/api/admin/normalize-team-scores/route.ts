import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

/**
 * 項目ごとに全チームの平均と各チームの平均の差を計算し、
 * 全チーム平均より低いチームには差分をプラス、
 * 全チーム平均より高いチームには差分をマイナスして調整する
 * （生の評価は変更せず、表示用の OthersScoreAdjustment に 0.1 単位で保存）
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const yearMonth = searchParams.get('year_month') || new Date().toISOString().slice(0, 7)

    // 指定年月の評価データを取得（自己評価を除外して集計に使用）
    const evaluations = await prisma.evaluation.findMany({
      where: {
        yearMonth,
      },
      include: {
        evaluated: {
          select: {
            team: true,
            role: true,
          },
        },
      },
    })

    // 一般ユーザーのみ対象（role: user）
    const userEvaluations = evaluations.filter(
      ev => ev.evaluated.role === 'user' && ev.evaluated.team != null
    )

    if (userEvaluations.length === 0) {
      return NextResponse.json(
        { error: `指定年月（${yearMonth}）に評価データがありません` },
        { status: 400 }
      )
    }

    // (evaluated_id, item_id) ごとの他者評価平均を計算（自己評価除外）
    const memberItemScores = new Map<string, number[]>()
    userEvaluations.forEach(ev => {
      if (ev.evaluatorId !== ev.evaluatedId) {
        const key = `${ev.evaluatedId}_${ev.itemId}`
        if (!memberItemScores.has(key)) {
          memberItemScores.set(key, [])
        }
        memberItemScores.get(key)!.push(ev.score)
      }
    })

    const rawAvgByMemberItem = new Map<string, number>()
    memberItemScores.forEach((scores, key) => {
      rawAvgByMemberItem.set(key, scores.reduce((a, b) => a + b, 0) / scores.length)
    })

    // 項目ごとの全チーム平均を計算（自己評価除外）
    const itemScores = new Map<number, number[]>()
    userEvaluations.forEach(ev => {
      if (ev.evaluatorId !== ev.evaluatedId) {
        if (!itemScores.has(ev.itemId)) {
          itemScores.set(ev.itemId, [])
        }
        itemScores.get(ev.itemId)!.push(ev.score)
      }
    })

    const overallAvgByItem = new Map<number, number>()
    itemScores.forEach((scores, itemId) => {
      overallAvgByItem.set(itemId, scores.reduce((a, b) => a + b, 0) / scores.length)
    })

    // 項目×チームごとの平均を計算（自己評価除外）
    const teamItemScores = new Map<string, number[]>()
    userEvaluations.forEach(ev => {
      if (ev.evaluatorId !== ev.evaluatedId && ev.evaluated.team) {
        const key = `${ev.itemId}_${ev.evaluated.team}`
        if (!teamItemScores.has(key)) {
          teamItemScores.set(key, [])
        }
        teamItemScores.get(key)!.push(ev.score)
      }
    })

    const teamAvgByItem = new Map<string, number>()
    teamItemScores.forEach((scores, key) => {
      teamAvgByItem.set(key, scores.reduce((a, b) => a + b, 0) / scores.length)
    })

    // 各 (member, item) に対して調整を OthersScoreAdjustment に保存
    const toUpsert: { memberId: number; itemId: number; adjustedScore: number }[] = []

    rawAvgByMemberItem.forEach((rawAvg, key) => {
      const [memberIdStr, itemIdStr] = key.split('_')
      const memberId = parseInt(memberIdStr, 10)
      const itemId = parseInt(itemIdStr, 10)

      const memberEval = userEvaluations.find(ev => ev.evaluatedId === memberId)
      if (!memberEval?.evaluated.team) return

      const overallAvg = overallAvgByItem.get(itemId)
      const teamKey = `${itemId}_${memberEval.evaluated.team}`
      const teamAvg = teamAvgByItem.get(teamKey)
      if (overallAvg == null || teamAvg == null) return

      // 差分 = 全チーム平均 - チーム平均
      const diff = overallAvg - teamAvg
      const adjustedScore = Math.round((rawAvg + diff) * 10) / 10
      const clampedScore = Math.max(0, Math.min(10, adjustedScore))

      toUpsert.push({ memberId, itemId, adjustedScore: clampedScore })
    })

    let upsertCount = 0
    try {
      for (const u of toUpsert) {
        await prisma.othersScoreAdjustment.upsert({
          where: {
            memberId_itemId_yearMonth: {
              memberId: u.memberId,
              itemId: u.itemId,
              yearMonth,
            },
          },
          update: { adjustedScore: u.adjustedScore, updatedAt: new Date() },
          create: {
            memberId: u.memberId,
            itemId: u.itemId,
            yearMonth,
            adjustedScore: u.adjustedScore,
          },
        })
        upsertCount++
      }
    } catch {
      // OthersScoreAdjustment テーブルが未作成の場合は無視
    }

    return NextResponse.json({
      success: true,
      year_month: yearMonth,
      adjusted_count: upsertCount,
      total_member_items: toUpsert.length,
    })
  } catch (error: any) {
    if (error.message === '認証が必要です' || error.message === '管理者権限が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('管理者') ? 403 : 401 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'エラーが発生しました' },
      { status: 500 }
    )
  }
}
