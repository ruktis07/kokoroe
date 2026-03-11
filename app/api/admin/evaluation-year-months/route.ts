import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

/** 評価データが存在する年月一覧を取得（管理者用） */
export async function GET() {
  try {
    await requireAdmin()

    const periods = await prisma.evaluation.findMany({
      where: {
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

    const yearMonths = periods.map(p => p.yearMonth).filter(Boolean) as string[]

    return NextResponse.json({
      year_months: yearMonths.map(ym => ({ year_month: ym })),
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
