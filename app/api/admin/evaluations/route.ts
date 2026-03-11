import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()

    const evaluations = await prisma.evaluation.findMany({
      include: {
        evaluator: {
          select: {
            name: true,
          },
        },
        evaluated: {
          select: {
            name: true,
            team: true,
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
      orderBy: [
        { evaluated: { team: 'asc' } },
        { evaluated: { name: 'asc' } },
        { item: { displayOrder: 'asc' } },
      ],
    })

    const result = evaluations.map(ev => ({
      id: ev.id,
      evaluator_id: ev.evaluatorId,
      evaluator_name: ev.evaluator.name,
      evaluated_id: ev.evaluatedId,
      evaluated_name: ev.evaluated.name,
      evaluated_team: ev.evaluated.team,
      item_id: ev.itemId,
      major_category: ev.item.majorCategory,
      minor_category: ev.item.minorCategory,
      score: ev.score,
      year_month: ev.yearMonth,
      created_at: ev.createdAt,
      updated_at: ev.updatedAt,
    }))

    return NextResponse.json({ evaluations: result })
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
