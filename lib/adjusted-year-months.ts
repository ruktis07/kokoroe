import { prisma } from '@/lib/prisma'

/** チーム間調整が完了している年月一覧（新しい順） */
export async function getAdjustedYearMonths(): Promise<string[]> {
  const rows = await prisma.othersScoreAdjustment.findMany({
    select: { yearMonth: true },
    distinct: ['yearMonth'],
    orderBy: { yearMonth: 'desc' },
  })
  return rows.map(r => r.yearMonth)
}
