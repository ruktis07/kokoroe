import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const yearMonth = searchParams.get('year_month') || new Date().toISOString().slice(0, 7)

    const evaluations = await prisma.evaluation.findMany({
      where: {
        yearMonth,
      },
      include: {
        evaluator: {
          select: {
            name: true,
            team: true,
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
          },
        },
      },
      orderBy: [
        { evaluator: { team: 'asc' } },
        { evaluator: { name: 'asc' } },
        { evaluated: { name: 'asc' } },
        { item: { displayOrder: 'asc' } },
      ],
    })

    // CSVヘッダー
    let csv = '\uFEFF' // BOM for Excel
    csv += '評価者名,評価者チーム,被評価者名,被評価者チーム,大項目,中項目,評点,年月,登録日時\n'

    // データ行
    evaluations.forEach(ev => {
      csv += `"${ev.evaluator.name}","${ev.evaluator.team || ''}","${ev.evaluated.name}","${ev.evaluated.team || ''}","${ev.item.majorCategory}","${ev.item.minorCategory}",${ev.score},"${ev.yearMonth}","${ev.createdAt.toISOString()}"\n`
    })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="evaluations_${yearMonth}.csv"`,
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
