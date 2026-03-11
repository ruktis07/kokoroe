import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * デプロイ環境で DB（Supabase）接続ができているか確認する用。
 * GET /api/health で { ok: true } なら接続成功、ok: false なら接続失敗。
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
