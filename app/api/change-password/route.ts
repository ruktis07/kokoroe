import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと新しいパスワードを入力してください' },
        { status: 400 }
      )
    }

    if (newPassword.length < 3) {
      return NextResponse.json(
        { error: '新しいパスワードは3文字以上で設定してください' },
        { status: 400 }
      )
    }

    // 現在のパスワードを確認
    const member = await prisma.member.findUnique({
      where: { id: currentUser.id },
      select: { password: true },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // パスワード検証
    let passwordValid = false
    if (member.password) {
      if (member.password.startsWith('$2')) {
        passwordValid = await bcrypt.compare(currentPassword, member.password)
      } else {
        passwordValid = member.password === currentPassword
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      )
    }

    // パスワードをハッシュ化して更新
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.member.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, message: 'パスワードを変更しました' })
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
