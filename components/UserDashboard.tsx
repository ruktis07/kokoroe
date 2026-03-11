'use client'

import { useState } from 'react'
import EvaluationTab from '@/components/user/EvaluationTab'
import MyResultsTab from '@/components/user/MyResultsTab'
import SummaryTab from '@/components/user/SummaryTab'
import MonthlyTab from '@/components/user/MonthlyTab'
import SettingsTab from '@/components/user/SettingsTab'

interface User {
  id: number
  username: string
  name: string
  team: string | null
  role: string
}

interface UserDashboardProps {
  user: User
  onLogout: () => void
}

type Tab = 'evaluation' | 'my-results' | 'summary' | 'monthly' | 'settings'

export default function UserDashboard({ user, onLogout }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('evaluation')
  const [loading, setLoading] = useState(false)
  // 採点・入力結果の表の向き（共有: どちらで変更しても両方に反映）
  const [tableFlipped, setTableFlipped] = useState(false)

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
        <div className="max-w-full mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <i className="fas fa-user text-xl sm:text-2xl text-blue-500 flex-shrink-0"></i>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-800 truncate">心得評価</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {user.name} さん（{user.team}）
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-700 active:opacity-80 flex-shrink-0 py-2 px-3 touch-manipulation min-h-[44px] flex items-center"
            >
              <i className="fas fa-sign-out-alt sm:mr-2"></i>
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 border-b border-gray-200">
          <div className="flex gap-0 min-w-max sm:min-w-0 sm:flex-wrap">
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'evaluation'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-edit mr-1 sm:mr-2"></i>採点
            </button>
            <button
              onClick={() => setActiveTab('my-results')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'my-results'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-clipboard-list mr-1 sm:mr-2"></i>入力結果
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-chart-bar mr-1 sm:mr-2"></i>集計
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-calendar-alt mr-1 sm:mr-2"></i>月次
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 sm:px-6 py-3 font-semibold whitespace-nowrap touch-manipulation min-h-[48px] border-b-2 -mb-px ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-cog mr-1 sm:mr-2"></i>設定
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'evaluation' && <EvaluationTab tableFlipped={tableFlipped} onTableFlippedChange={setTableFlipped} />}
          {activeTab === 'my-results' && <MyResultsTab tableFlipped={tableFlipped} onTableFlippedChange={setTableFlipped} />}
          {activeTab === 'summary' && <SummaryTab isAdmin={user.role === 'admin'} />}
          {activeTab === 'monthly' && <MonthlyTab isAdmin={user.role === 'admin'} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  )
}
