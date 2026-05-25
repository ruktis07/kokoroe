import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getOpenPeriodYearMonth } from '@/lib/evaluation-period'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()
    const { evaluations } = await request.json()

    if (!evaluations || !Array.isArray(evaluations)) {
      return NextResponse.json(
        { error: '評価データが不正です' },
        { status: 400 }
      )
    }

    // 入力可能な評価期間の年月（例: 終了日3/10の2月度 → 3/1〜3/10は 2026-02 として保存）
    const yearMonth = await getOpenPeriodYearMonth()
    if (yearMonth == null) {
      return NextResponse.json(
        { error: '評価期間ではありません。評価の入力・保存は、管理者が設定した評価期間中のみ可能です。' },
        { status: 400 }
      )
    }

    // バリデーション通過分のみ抽出
    const valid = (evaluations as any[]).filter((ev) => {
      const { evaluated_id, item_id, score } = ev
      return (
        evaluated_id &&
        item_id &&
        typeof score === 'number' &&
        Number.isInteger(score) &&
        score >= 1 &&
        score <= 10
      )
    })

    if (valid.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // 配列をカラム別に展開して UNNEST 経由で一括 UPSERT
    // → 旧実装は N件ぶん N往復していたのを、1往復で完結させる
    const evaluatedIds = valid.map((ev) => Number(ev.evaluated_id))
    const itemIds = valid.map((ev) => Number(ev.item_id))
    const scores = valid.map((ev) => Number(ev.score))

    await prisma.$executeRaw`
      INSERT INTO evaluations (
        evaluator_id, evaluated_id, item_id, score, year_month, created_at, updated_at
      )
      SELECT
        ${currentUser.id}::int,
        t.evaluated_id,
        t.item_id,
        t.score,
        ${yearMonth}::varchar,
        NOW(),
        NOW()
      FROM UNNEST(
        ${evaluatedIds}::int[],
        ${itemIds}::int[],
        ${scores}::int[]
      ) AS t(evaluated_id, item_id, score)
      ON CONFLICT (evaluator_id, evaluated_id, item_id, year_month)
      DO UPDATE SET
        score = EXCLUDED.score,
        updated_at = NOW()
    `

    return NextResponse.json({ success: true, count: valid.length })
  } catch (error: any) {
    if (error.message === '認証が必要です') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    console.error('bulk evaluations error:', error)
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}
