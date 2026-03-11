/** 集計・月次タブ表示ログの保持期間（日数）。この日数を超えたログは削除される。 */
export const TAB_VIEW_LOG_RETENTION_DAYS = 60 // 2か月

export function getTabViewLogCutoffDate(): Date {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - TAB_VIEW_LOG_RETENTION_DAYS)
  return cutoff
}
