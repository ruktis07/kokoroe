const JST_TIME_ZONE = 'Asia/Tokyo'

/** 日本時間（JST）の今日を YYYY-MM-DD で返す。評価期間の判定に使用。 */
export function getTodayYmdInJST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JST_TIME_ZONE,
  }).format(new Date())
}
