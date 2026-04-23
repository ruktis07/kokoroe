'use client'

/** 利用者向けの外部リンク一覧（拡張しやすいよう配列化） */
const EXTERNAL_LINKS = [
  {
    label: '満足度情報(JustDB)',
    href: 'https://mizutani-v.just-db.com/sites/view?folder=378&workspace=565',
  },
] as const

export default function LinksTab() {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
        <i className="fas fa-link mr-2 text-blue-500"></i>
        リンク集
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        以下のリンクは別サイトが開きます。
      </p>
      <ul className="space-y-3">
        {EXTERNAL_LINKS.map(({ label, href }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-2 text-blue-600 hover:text-blue-800 underline break-all"
            >
              <i className="fas fa-external-link-alt flex-shrink-0 mt-0.5"></i>
              <span>
                <span className="block">{label}</span>
                <span className="block text-xs font-normal text-gray-500 no-underline mt-1">{href}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
