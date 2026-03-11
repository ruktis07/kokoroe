import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await requireAuth()

    const members = await prisma.member.findMany({
      where: {
        team: currentUser.team,
      },
      select: {
        id: true,
        username: true,
        name: true,
        team: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ members })
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
