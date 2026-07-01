import { getTodayYmdInJST } from '@/lib/date'
import { prisma } from '@/lib/prisma'

/**
 * 終了日を過ぎた評価期間を無効（isActive: false）に更新する。
 * 期間を過ぎたら状態を無効にしておくため、getOpenPeriod や一覧取得の前に呼ぶ。
 */
export async function expirePastPeriods(): Promise<void> {
  const today = getTodayYmdInJST()
  await prisma.evaluationPeriod.updateMany({
    where: {
      isActive: true,
      endDate: { lt: today },
    },
    data: { isActive: false },
  })
}

/**
 * 日本時間の「今日」が start_date 〜 end_date の間に入っている「有効な」評価期間を1件取得する。
 * 終了日はその日いっぱい（23:59 JST まで）入力可能。例: 終了 6/30 なら 6/30 中は可、7/1 0:00 JST から不可。
 * 例: 2月度の終了日を 3/10 にすると、3/1〜3/10 の間は「2月度」として入力可能になる。
 * 取得前に終了日を過ぎた期間は自動で無効にする。
 */
export async function getOpenPeriod(): Promise<{
  yearMonth: string
  startDate: string
  endDate: string
} | null> {
  await expirePastPeriods()
  return getOpenPeriodFast()
}

/**
 * expirePastPeriods をスキップした読み取り専用版。
 * 呼び出し元で expirePastPeriods を実行したうえで使うこと。
 */
export async function getOpenPeriodFast(): Promise<{
  yearMonth: string
  startDate: string
  endDate: string
} | null> {
  const today = getTodayYmdInJST()

  const period = await prisma.evaluationPeriod.findFirst({
    where: {
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    orderBy: { yearMonth: 'desc' },
  })

  return period ? { yearMonth: period.yearMonth, startDate: period.startDate, endDate: period.endDate } : null
}

/** 開始日が日本時間の「今日」より後の、次の評価期間を1件取得する */
export async function getNextPeriod(): Promise<{
  yearMonth: string
  startDate: string
  endDate: string
} | null> {
  const today = getTodayYmdInJST()

  const period = await prisma.evaluationPeriod.findFirst({
    where: {
      isActive: true,
      startDate: { gt: today },
    },
    orderBy: { startDate: 'asc' },
  })

  return period ? { yearMonth: period.yearMonth, startDate: period.startDate, endDate: period.endDate } : null
}

/**
 * 現在入力可能な評価期間の年月（YYYY-MM）。期間がなければ null。
 * 評価の保存時にこの値を使うと「2月度を3/10まで入力」が正しく動く。
 */
export async function getOpenPeriodYearMonth(): Promise<string | null> {
  const period = await getOpenPeriod()
  return period?.yearMonth ?? null
}

/**
 * 入力結果タブで表示する評価月度。
 * 評価期間中は現在の期間、期間外（次回開始前）は直近に終了した期間を返す。
 */
export async function getResultsDisplayYearMonth(): Promise<string | null> {
  const open = await getOpenPeriod()
  if (open) return open.yearMonth

  const today = getTodayYmdInJST()
  const lastPeriod = await prisma.evaluationPeriod.findFirst({
    where: { endDate: { lt: today } },
    orderBy: { endDate: 'desc' },
  })
  return lastPeriod?.yearMonth ?? null
}
