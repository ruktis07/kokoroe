import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setSessionUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: 'ユーザー名を入力してください' },
        { status: 400 }
      )
    }

    const member = await prisma.member.findUnique({
      where: { username },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // パスワードチェック
    if (!password) {
      return NextResponse.json(
        { error: 'パスワードを入力してください' },
        { status: 400 }
      )
    }

    // パスワードがハッシュ化されている場合はbcryptで比較、そうでない場合は平文比較
    let passwordValid = false
    if (member.password) {
      if (member.password.startsWith('$2')) {
        // bcryptハッシュ
        passwordValid = await bcrypt.compare(password, member.password)
      } else {
        // 平文（後方互換性）
        passwordValid = member.password === password
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      )
    }

    // セッション設定
    const sessionUser = {
      id: member.id,
      username: member.username,
      name: member.name,
      team: member.team,
      role: member.role,
    }

    await setSessionUser(sessionUser)

    return NextResponse.json({
      success: true,
      user: sessionUser,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'ログインに失敗しました' },
      { status: 500 }
    )
  }
}
