/**
 * 本番（Vercel + Supabase）用に「ユーザー・項目・評価期間」だけをエクスポートします。
 * 採点結果（evaluations, others_score_adjustments, tab_view_logs）は含めません。
 *
 * 使い方:
 *   1. .env の DATABASE_URL / DIRECT_URL を「ローカルDB」にしておく（必須）。
 *      （Supabase を指していると認証エラーになる。エクスポートはローカルから読む）
 *   2. npm run export-for-production を実行する。
 *   3. 生成された supabase/seed-members-and-items.sql を Supabase の SQL Editor で実行する。
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

function sqlDate(d: Date): string {
  return d.toISOString().replace('T', ' ').replace('Z', '+00')
}

async function main() {
  const outPath = path.join(process.cwd(), 'supabase', 'seed-members-and-items.sql')
  const lines: string[] = [
    '-- 本番用: ユーザー・項目・評価期間のみ（採点結果は含みません）',
    '-- このファイルは scripts/export-for-production.ts で生成されます。',
    '',
  ]

  // 1. members
  const members = await prisma.member.findMany({ orderBy: { id: 'asc' } })
  if (members.length > 0) {
    lines.push('-- members')
    for (const m of members) {
      const team = m.team === null ? 'NULL' : `'${escapeSql(m.team)}'`
      const password = m.password === null ? 'NULL' : `'${escapeSql(m.password)}'`
      lines.push(
        `INSERT INTO members (id, username, name, team, role, password, created_at, updated_at) VALUES (${m.id}, '${escapeSql(m.username)}', '${escapeSql(m.name)}', ${team}, '${escapeSql(m.role)}', ${password}, '${sqlDate(m.createdAt)}', '${sqlDate(m.updatedAt)}') ON CONFLICT (username) DO NOTHING;`
      )
    }
    lines.push('SELECT setval(\'members_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM members));', '')
  }

  // 2. evaluation_items
  const items = await prisma.evaluationItem.findMany({ orderBy: { id: 'asc' } })
  if (items.length > 0) {
    lines.push('-- evaluation_items')
    for (const i of items) {
      lines.push(
        `INSERT INTO evaluation_items (id, major_category, minor_category, display_order, created_at, updated_at) VALUES (${i.id}, '${escapeSql(i.majorCategory)}', '${escapeSql(i.minorCategory)}', ${i.displayOrder}, '${sqlDate(i.createdAt)}', '${sqlDate(i.updatedAt)}') ON CONFLICT (id) DO NOTHING;`
      )
    }
    lines.push('SELECT setval(\'evaluation_items_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM evaluation_items));', '')
  }

  // 3. evaluation_periods
  const periods = await prisma.evaluationPeriod.findMany({ orderBy: { id: 'asc' } })
  if (periods.length > 0) {
    lines.push('-- evaluation_periods')
    for (const p of periods) {
      lines.push(
        `INSERT INTO evaluation_periods (id, year_month, start_date, end_date, is_active, created_at, updated_at) VALUES (${p.id}, '${escapeSql(p.yearMonth)}', '${escapeSql(p.startDate)}', '${escapeSql(p.endDate)}', ${p.isActive}, '${sqlDate(p.createdAt)}', '${sqlDate(p.updatedAt)}') ON CONFLICT (year_month) DO NOTHING;`
      )
    }
    lines.push('SELECT setval(\'evaluation_periods_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM evaluation_periods));', '')
  }

  const dir = path.dirname(outPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log(`Written: ${outPath}`)
  console.log(`  members: ${members.length}, evaluation_items: ${items.length}, evaluation_periods: ${periods.length}`)
  console.log('  → Supabase の SQL Editor でこのファイルを実行してください。採点結果は含まれません。')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
