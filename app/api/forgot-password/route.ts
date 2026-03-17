import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * パスワードを忘れた場合の依頼（未ログインで呼び出し可）。
 * ユーザー名に一致するメンバーがいる場合、パスワードリセット依頼日時を記録する。
 * 存在の有無は返さず、常に同じメッセージを返す（ユーザー列挙防止）。
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    const u = typeof username === 'string' ? username.trim() : ''
    if (!u) {
      return NextResponse.json(
        { message: 'ユーザー名を入力してください。送信後、管理者にパスワードリセットをお願いしてください。' },
        { status: 400 }
      )
    }

    await prisma.member.updateMany({
      where: { username: u },
      data: { passwordResetRequestedAt: new Date() },
    })

    return NextResponse.json({
      message: '送信しました。管理者に連絡し、メンバー管理画面からパスワードリセットをお願いしてください。',
    })
  } catch {
    return NextResponse.json({
      message: '送信しました。管理者に連絡し、メンバー管理画面からパスワードリセットをお願いしてください。',
    })
  }
}
