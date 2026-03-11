'use client'

import { useState } from 'react'
import MembersTab from '@/components/admin/MembersTab'
import ItemsTab from '@/components/admin/ItemsTab'
import PeriodsTab from '@/components/admin/PeriodsTab'
import AdjustmentsTab from '@/components/admin/AdjustmentsTab'
import TabViewLogsTab from '@/components/admin/TabViewLogsTab'

interface User {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

interface AdminDashboardProps {
  user: User
  onLogout: () => void
}

type Tab = 'members' | 'items' | 'periods' | 'adjustments' | 'summary-monthly'

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
            <p className="mt-4 text-gray-700">読み込み中...</p>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <i className="fas fa-user-shield text-xl sm:text-2xl text-blue-500 flex-shrink-0"></i>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-800 truncate">管理者</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{user.name}さん</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-700 active:opacity-80 py-2 px-3 touch-manipulation min-h-[44px] flex items-center"
            >
                <i className="fas fa-sign-out-alt sm:mr-2"></i>
                <span className="hidden sm:inline">ログアウト</span>
              </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 border-b border-gray-200">
          <div className="flex gap-0 min-w-max sm:min-w-0 sm:flex-wrap">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-users mr-1 sm:mr-2"></i>メンバー
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-list mr-1 sm:mr-2"></i>評価項目
            </button>
            <button
              onClick={() => setActiveTab('periods')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'periods'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-calendar-check mr-1 sm:mr-2"></i>期間
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'adjustments'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-edit mr-1 sm:mr-2"></i>採点調整
            </button>
            <button
              onClick={() => setActiveTab('summary-monthly')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'summary-monthly'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-history mr-1 sm:mr-2"></i>集計ログ
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'items' && <ItemsTab />}
          {activeTab === 'periods' && <PeriodsTab />}
          {activeTab === 'adjustments' && <AdjustmentsTab />}
          {activeTab === 'summary-monthly' && <TabViewLogsTab />}
        </div>
      </div>
    </div>
  )
}
