import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await requireAuth()

    // 前月の年月を計算（seed.tsと同じ計算方法）
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    
    // 前月を計算
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const previousYearMonth = `${previousYear}-${String(previousMonth).padStart(2, '0')}`

    console.log(`[前回評価API] ユーザーID: ${currentUser.id}, 前月: ${previousYearMonth}`)

    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatorId: currentUser.id,
        yearMonth: previousYearMonth,
      },
      select: {
        evaluatedId: true,
        itemId: true,
        score: true,
      },
    })

    console.log(`[前回評価API] 取得した評価データ数: ${evaluations.length}`)

    // フロントエンドで期待されるスネークケースに変換
    const result = evaluations.map(ev => ({
      evaluated_id: ev.evaluatedId,
      item_id: ev.itemId,
      score: ev.score,
    }))

    console.log(`[前回評価API] 返却するデータ数: ${result.length}`)

    return NextResponse.json({ previousEvaluations: result })
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
