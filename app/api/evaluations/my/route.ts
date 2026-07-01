import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getResultsDisplayYearMonth } from '@/lib/evaluation-period'

export async function GET() {
  try {
    const currentUser = await requireAuth()

    // 評価期間中は当月度、期間外（次回開始前）は直近に終了した月度のデータを表示
    const yearMonth = await getResultsDisplayYearMonth()
    if (yearMonth == null) {
      return NextResponse.json({ evaluations: [], year_month: null })
    }

    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatorId: currentUser.id,
        yearMonth,
      },
      include: {
        evaluated: {
          select: {
            name: true,
          },
        },
        item: {
          select: {
            majorCategory: true,
            minorCategory: true,
          },
        },
      },
      orderBy: [
        { evaluated: { name: 'asc' } },
        { item: { displayOrder: 'asc' } },
      ],
    })

    const result = evaluations.map(ev => ({
      id: ev.id,
      evaluated_id: ev.evaluatedId,
      evaluated_name: ev.evaluated.name,
      item_id: ev.itemId,
      major_category: ev.item.majorCategory,
      minor_category: ev.item.minorCategory,
      score: ev.score,
      year_month: ev.yearMonth,
      created_at: ev.createdAt,
      updated_at: ev.updatedAt,
    }))

    return NextResponse.json({ evaluations: result, year_month: yearMonth })
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
