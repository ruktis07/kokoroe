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
    const { name, team } = await request.json()

    await prisma.member.update({
      where: { id },
      data: { name, team },
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
      { error: 'メンバーの更新に失敗しました' },
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

    // 管理者自身は削除できない
    if (id === 1) {
      return NextResponse.json(
        { error: '管理者アカウントは削除できません' },
        { status: 400 }
      )
    }

    await prisma.member.delete({
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
      { error: 'メンバーの削除に失敗しました' },
      { status: 500 }
    )
  }
}
