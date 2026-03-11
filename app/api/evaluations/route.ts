import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getOpenPeriodYearMonth } from '@/lib/evaluation-period'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    const { evaluated_id, item_id, score } = await request.json()

    if (!evaluated_id || !item_id || !score) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    if (score < 1 || score > 10) {
      return NextResponse.json(
        { error: '評価は1～10の範囲で入力してください' },
        { status: 400 }
      )
    }

    // 入力可能な評価期間の年月。期間外の場合は保存不可
    const yearMonth = await getOpenPeriodYearMonth()
    if (yearMonth == null) {
      return NextResponse.json(
        { error: '評価期間ではありません。評価の入力・保存は、管理者が設定した評価期間中のみ可能です。' },
        { status: 400 }
      )
    }

    await prisma.evaluation.upsert({
      where: {
        evaluator_evaluated_item_year_month: {
          evaluatorId: currentUser.id,
          evaluatedId: evaluated_id,
          itemId: item_id,
          yearMonth,
        },
      },
      update: {
        score,
        updatedAt: new Date(),
      },
      create: {
        evaluatorId: currentUser.id,
        evaluatedId: evaluated_id,
        itemId: item_id,
        score,
        yearMonth,
      },
    })

    return NextResponse.json({ success: true })
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
