import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()

    const members = await prisma.member.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        team: true,
        role: true,
        passwordResetRequestedAt: true,
        createdAt: true,
      },
      orderBy: [
        { team: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ members })
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

    const { username, name, team } = await request.json()

    if (!username || !name || !team) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    const member = await prisma.member.create({
      data: {
        username,
        name,
        team,
        role: 'user',
        password: username, // 初期パスワードはユーザー名と同じ
      },
    })

    return NextResponse.json({ success: true, id: member.id })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'このユーザー名は既に使用されています' },
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
      { error: 'メンバーの追加に失敗しました' },
      { status: 500 }
    )
  }
}
