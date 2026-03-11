// テーマ設定（色やスタイルの統一管理）
// このファイルで色やスタイルを変更すると、アプリ全体に反映されます

export const theme = {
  // テーブルヘッダーのスタイル
  tableHeader: {
    // 大項目のスタイル
    majorCategory: {
      className: 'font-bold text-sm text-white',
    },
    // 中項目のスタイル（白文字、白枠なし）
    minorCategory: {
      className: 'text-xs mt-1 font-normal text-white break-words',
    },
    // ヘッダー全体のスタイル
    base: {
      className: 'border border-gray-300 bg-blue-700 text-white px-4 py-3 text-center',
      minWidth: 'min-w-[200px]', // 中項目が長いので幅を広げる
    },
  },
  
  // 評価項目の表示スタイル
  evaluationItem: {
    // 大項目のスタイル
    majorCategory: {
      className: 'font-semibold text-lg text-blue-600',
    },
    // 中項目のスタイル（通常の表示）
    minorCategory: {
      className: 'font-medium text-gray-800', // 黒文字で見やすく
    },
  },
  
  // メンバー名のスタイル
  memberName: {
    className: 'font-semibold text-gray-800', // 黒文字で見やすく
  },
  
  // ボタンのスタイル
  button: {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white font-bold',
    success: 'bg-green-500 hover:bg-green-600 text-white font-bold',
    danger: 'bg-red-500 hover:bg-red-600 text-white font-bold',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white font-bold',
  },
  
  // テキストの色
  text: {
    primary: 'text-gray-800', // メインのテキスト（黒）
    secondary: 'text-gray-600', // サブテキスト（グレー）
    muted: 'text-gray-400', // 薄いテキスト（薄いグレー）
    white: 'text-white', // 白文字
  },
  
  // 背景色
  background: {
    white: 'bg-white',
    gray: 'bg-gray-50',
    blue: 'bg-blue-50',
  },
}
