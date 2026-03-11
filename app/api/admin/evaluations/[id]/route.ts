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
    const { score } = await request.json()

    if (score < 1 || score > 10) {
      return NextResponse.json(
        { error: '評価は1～10の範囲で入力してください' },
        { status: 400 }
      )
    }

    await prisma.evaluation.update({
      where: { id },
      data: {
        score,
        updatedAt: new Date(),
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
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}
