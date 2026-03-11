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
    const { major_category, minor_category, display_order } = await request.json()

    const count = await prisma.evaluationItem.count()
    const newOrder = Math.max(1, Math.min(count, parseInt(String(display_order), 10) || 1))
    const current = await prisma.evaluationItem.findUnique({
      where: { id },
      select: { displayOrder: true },
    })
    if (!current) {
      return NextResponse.json({ error: '項目が見つかりません' }, { status: 404 })
    }
    const oldOrder = current.displayOrder

    if (oldOrder !== newOrder) {
      if (newOrder > oldOrder) {
        // 下へ移動: (oldOrder, newOrder] の項目を -1
        await prisma.evaluationItem.updateMany({
          where: {
            id: { not: id },
            displayOrder: { gt: oldOrder, lte: newOrder },
          },
          data: { displayOrder: { decrement: 1 } },
        })
      } else {
        // 上へ移動: [newOrder, oldOrder) の項目を +1
        await prisma.evaluationItem.updateMany({
          where: {
            id: { not: id },
            displayOrder: { gte: newOrder, lt: oldOrder },
          },
          data: { displayOrder: { increment: 1 } },
        })
      }
    }

    await prisma.evaluationItem.update({
      where: { id },
      data: {
        majorCategory: major_category,
        minorCategory: minor_category,
        displayOrder: newOrder,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === '認証が必要です' || error.message === '管理者権限が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('管理者') ? 403 : 401 }
      )
    }
    return NextResponse.json(
      { error: '評価項目の更新に失敗しました' },
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

    await prisma.evaluationItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === '認証が必要です' || error.message === '管理者権限が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('管理者') ? 403 : 401 }
      )
    }
    return NextResponse.json(
      { error: '評価項目の削除に失敗しました' },
      { status: 500 }
    )
  }
}
