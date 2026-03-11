/**
 * 値をCSV用にエスケープ（カンマ・改行・ダブルクォートを含む場合はクォートで囲む）
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * オブジェクト配列をCSV文字列に変換してダウンロード
 */
export function downloadCsv(
  rows: Record<string, string | number | null | undefined>[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  const BOM = '\uFEFF'
  const headerLine = headers.map(h => escapeCsvValue(h.label)).join(',')
  const dataLines = rows.map(row =>
    headers.map(h => escapeCsvValue(row[h.key])).join(',')
  )
  const csv = BOM + [headerLine, ...dataLines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
