import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getTabViewLogCutoffDate } from '@/lib/tab-view-log'

/**
 * 利用者が集計タブまたは月次タブを表示したときに呼ばれる。
 * 管理者は記録しない。2か月を超えた古いログは削除する。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role === 'admin') {
      return NextResponse.json({ ok: true })
    }
    const body = await request.json()
    const tab = body?.tab === 'monthly' ? 'monthly' : 'summary'
    await prisma.tabViewLog.create({
      data: {
        userId: user.id,
        tab,
      },
    })
    const cutoff = getTabViewLogCutoffDate()
    await prisma.tabViewLog.deleteMany({
      where: { viewedAt: { lt: cutoff } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
