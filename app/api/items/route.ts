import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const items = await prisma.evaluationItem.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { id: 'asc' },
      ],
    })

    // キャメルケースをスネークケースに変換（nameとdescriptionは削除）
    const formattedItems = items.map(item => ({
      id: item.id,
      major_category: item.majorCategory,
      minor_category: item.minorCategory,
      display_order: item.displayOrder,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }))

    return NextResponse.json({ items: formattedItems })
  } catch (error) {
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { major_category, minor_category, display_order } = await request.json()

    if (!major_category || !minor_category) {
      return NextResponse.json(
        { error: '大項目と中項目を入力してください' },
        { status: 400 }
      )
    }

    const insertAt = Math.max(1, parseInt(String(display_order), 10) || 1)

    // 指定番号以降の表示順を1つずつずらす（同じ番号が重ならないように）
    await prisma.evaluationItem.updateMany({
      where: { displayOrder: { gte: insertAt } },
      data: { displayOrder: { increment: 1 } },
    })

    const item = await prisma.evaluationItem.create({
      data: {
        majorCategory: major_category,
        minorCategory: minor_category,
        displayOrder: insertAt,
      },
    })

    return NextResponse.json({ success: true, id: item.id })
  } catch (error: any) {
    if (error.message === '認証が必要です' || error.message === '管理者権限が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('管理者') ? 403 : 401 }
      )
    }
    return NextResponse.json(
      { error: '評価項目の追加に失敗しました' },
      { status: 500 }
    )
  }
}
