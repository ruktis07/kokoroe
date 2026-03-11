import { prisma } from '@/lib/prisma'

/**
 * 終了日を過ぎた評価期間を無効（isActive: false）に更新する。
 * 期間を過ぎたら状態を無効にしておくため、getOpenPeriod や一覧取得の前に呼ぶ。
 */
export async function expirePastPeriods(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  await prisma.evaluationPeriod.updateMany({
    where: {
      isActive: true,
      endDate: { lt: today },
    },
    data: { isActive: false },
  })
}

/**
 * 今日の日付が start_date 〜 end_date の間に入っている「有効な」評価期間を1件取得する。
 * 例: 2月度の終了日を 3/10 にすると、3/1〜3/10 の間は「2月度」として入力可能になる。
 * 取得前に終了日を過ぎた期間は自動で無効にする。
 */
export async function getOpenPeriod(): Promise<{
  yearMonth: string
  startDate: string
  endDate: string
} | null> {
  await expirePastPeriods()
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

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

/**
 * 現在入力可能な評価期間の年月（YYYY-MM）。期間がなければ null。
 * 評価の保存時にこの値を使うと「2月度を3/10まで入力」が正しく動く。
 */
export async function getOpenPeriodYearMonth(): Promise<string | null> {
  const period = await getOpenPeriod()
  return period?.yearMonth ?? null
}
