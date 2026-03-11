import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { expirePastPeriods } from '@/lib/evaluation-period'

export async function GET() {
  try {
    await requireAdmin()
    await expirePastPeriods()

    const rows = await prisma.evaluationPeriod.findMany({
      orderBy: {
        yearMonth: 'desc',
      },
    })

    const periods = rows.map(p => ({
      id: p.id,
      year_month: p.yearMonth,
      start_date: p.startDate,
      end_date: p.endDate,
      is_active: p.isActive,
    }))

    return NextResponse.json({ periods })
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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { yearMonth, startDate, endDate } = await request.json()

    if (!yearMonth || !startDate || !endDate) {
      return NextResponse.json(
        { error: '年月、開始日、終了日を入力してください' },
        { status: 400 }
      )
    }

    await prisma.evaluationPeriod.create({
      data: {
        yearMonth,
        startDate,
        endDate,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, message: '評価期間を追加しました' })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'この年月の評価期間は既に存在します' },
        { status: 400 }
      )
    }
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
