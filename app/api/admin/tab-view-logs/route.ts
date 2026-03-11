import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { getTabViewLogCutoffDate } from '@/lib/tab-view-log'

/**
 * 管理者用: 利用者が集計・月次タブを表示した履歴を取得。
 * 取得前に2か月を超えたログを削除する。
 */
export async function GET() {
  try {
    await requireAdmin()

    const cutoff = getTabViewLogCutoffDate()
    await prisma.tabViewLog.deleteMany({
      where: { viewedAt: { lt: cutoff } },
    })

    const logs = await prisma.tabViewLog.findMany({
      orderBy: { viewedAt: 'desc' },
      take: 500,
      include: {
        user: {
          select: { id: true, name: true, username: true, team: true },
        },
      },
    })
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user.name,
        username: l.user.username,
        team: l.user.team,
        tab: l.tab,
        viewedAt: l.viewedAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
