import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getOpenPeriod } from '@/lib/evaluation-period'

export async function GET() {
  try {
    await requireAuth()

    const period = await getOpenPeriod()

    if (period) {
      return NextResponse.json({
        isOpen: true,
        period: {
          yearMonth: period.yearMonth,
          startDate: period.startDate,
          endDate: period.endDate,
        },
        message: `${period.yearMonth}度の評価入力期間です（${period.startDate} 〜 ${period.endDate}まで）`,
      })
    }

    const hasAnyPeriod = await prisma.evaluationPeriod.count() > 0
    return NextResponse.json({
      isOpen: false,
      period: null,
      message: hasAnyPeriod
        ? '現在は評価期間外です。入力可能な期間は管理者が設定した開始日〜終了日の間のみです。'
        : '評価期間が設定されていません。',
    })
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
