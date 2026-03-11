import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { memberId, newPassword } = await request.json()

    if (!memberId || !newPassword) {
      return NextResponse.json(
        { error: 'メンバーIDと新しいパスワードを入力してください' },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: '新しいパスワードは4文字以上で設定してください' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化して更新
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.member.update({
      where: { id: memberId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, message: 'パスワードをリセットしました' })
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
