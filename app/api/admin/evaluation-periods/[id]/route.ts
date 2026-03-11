import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const id = parseInt(params.id)
    const body = await request.json()
    const { yearMonth, startDate, endDate, isActive } = body

    const data: { yearMonth?: string; startDate?: string; endDate?: string; isActive?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (yearMonth !== undefined) data.yearMonth = yearMonth
    if (startDate !== undefined) data.startDate = startDate
    if (endDate !== undefined) data.endDate = endDate
    if (isActive !== undefined) data.isActive = isActive

    await prisma.evaluationPeriod.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, message: '評価期間を更新しました' })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'この月度は既に他の評価期間で使用されています' },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const id = parseInt(params.id)

    await prisma.evaluationPeriod.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: '評価期間を削除しました' })
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
