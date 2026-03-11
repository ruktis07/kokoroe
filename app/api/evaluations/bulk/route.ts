import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getOpenPeriodYearMonth } from '@/lib/evaluation-period'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    const { evaluations } = await request.json()

    if (!evaluations || !Array.isArray(evaluations)) {
      return NextResponse.json(
        { error: '評価データが不正です' },
        { status: 400 }
      )
    }

    // 入力可能な評価期間の年月（例: 終了日3/10の2月度 → 3/1〜3/10は 2026-02 として保存）
    const yearMonth = await getOpenPeriodYearMonth()
    if (yearMonth == null) {
      return NextResponse.json(
        { error: '評価期間ではありません。評価の入力・保存は、管理者が設定した評価期間中のみ可能です。' },
        { status: 400 }
      )
    }

    // トランザクションで一括保存
    await prisma.$transaction(
      evaluations
        .filter((ev: any) => {
          const { evaluated_id, item_id, score } = ev
          return evaluated_id && item_id && score >= 1 && score <= 10
        })
        .map((ev: any) =>
          prisma.evaluation.upsert({
            where: {
              evaluator_evaluated_item_year_month: {
                evaluatorId: currentUser.id,
                evaluatedId: ev.evaluated_id,
                itemId: ev.item_id,
                yearMonth,
              },
            },
            update: {
              score: ev.score,
              updatedAt: new Date(),
            },
            create: {
              evaluatorId: currentUser.id,
              evaluatedId: ev.evaluated_id,
              itemId: ev.item_id,
              score: ev.score,
              yearMonth,
            },
          })
        )
    )

    return NextResponse.json({ success: true, count: evaluations.length })
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
