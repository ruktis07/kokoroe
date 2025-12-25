// グローバル状態管理
const state = {
  currentUser: null,
  members: [],
  items: [],
  evaluations: [],
  teamMembers: [],
  summary: [],
  loading: false
}

// Axios デフォルト設定（Cookie送信を有効化）
axios.defaults.withCredentials = true

// ローディング表示
function showLoading() {
  state.loading = true
  const loadingDiv = document.getElementById('loading-overlay')
  if (loadingDiv) {
    loadingDiv.classList.remove('hidden')
  }
}

function hideLoading() {
  state.loading = false
  const loadingDiv = document.getElementById('loading-overlay')
  if (loadingDiv) {
    loadingDiv.classList.add('hidden')
  }
}

// API呼び出しヘルパー
const api = {
  async call(method, url, data = null) {
    try {
      const config = { 
        method, 
        url,
        withCredentials: true
      }
      if (data) config.data = data
      const response = await axios(config)
      return response.data
    } catch (error) {
      if (error.response?.status === 401) {
        state.currentUser = null
        showLoginScreen()
        throw new Error('認証が必要です')
      }
      throw error
    }
  },
  get: (url) => api.call('GET', url),
  post: (url, data) => api.call('POST', url, data),
  put: (url, data) => api.call('PUT', url, data),
  delete: (url) => api.call('DELETE', url)
}

// ==================== 画面レンダリング ====================

function showLoginScreen() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div class="text-center mb-8">
          <i class="fas fa-users text-5xl text-blue-500 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-800">心得入力</h1>
          <p class="text-gray-600 mt-2">チーム評価システム</p>
        </div>
        
        <div id="login-error" class="hidden mb-4 p-3 bg-red-100 text-red-700 rounded"></div>
        
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-user mr-2"></i>ユーザー名
            </label>
            <input type="text" id="username" required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div id="password-field">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-lock mr-2"></i>パスワード
            </label>
            <input type="password" id="password" required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <button type="submit"
            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
            <i class="fas fa-sign-in-alt mr-2"></i>ログイン
          </button>
        </form>
        
        <div class="mt-6 text-center text-sm text-gray-600">
          <p>管理者: admin / admin</p>
          <p>使用者: ユーザー名 / ユーザー名（初期パスワード）</p>
        </div>
      </div>
    </div>
  `

  document.getElementById('login-form').addEventListener('submit', handleLogin)
}

async function handleLogin(e) {
  e.preventDefault()
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  const errorDiv = document.getElementById('login-error')
  const submitBtn = e.target.querySelector('button[type="submit"]')

  try {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>ログイン中...'
    
    const result = await api.post('/api/login', { username, password })
    state.currentUser = result.user
    
    if (result.user.role === 'admin') {
      await showAdminDashboard()
    } else {
      await showUserDashboard()
    }
  } catch (error) {
    errorDiv.textContent = error.response?.data?.error || 'ログインに失敗しました'
    errorDiv.classList.remove('hidden')
    submitBtn.disabled = false
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>ログイン'
  }
}

async function handleLogout() {
  await api.post('/api/logout')
  state.currentUser = null
  state.members = []
  state.items = []
  state.evaluations = []
  state.teamMembers = []
  state.summary = []
  showLoginScreen()
}

// ==================== 管理者画面 ====================

async function showAdminDashboard() {
  // データを一度だけ読み込み
  if (state.members.length === 0) await loadMembers()
  if (state.items.length === 0) await loadItems()
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- ローディングオーバーレイ -->
      <div id="loading-overlay" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-xl">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
          <p class="mt-4 text-gray-700">読み込み中...</p>
        </div>
      </div>

      <nav class="bg-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <i class="fas fa-user-shield text-2xl text-blue-500"></i>
              <div>
                <h1 class="text-xl font-bold text-gray-800">管理者ダッシュボード</h1>
                <p class="text-sm text-gray-600">${state.currentUser.name}さん</p>
              </div>
            </div>
            <button onclick="handleLogout()" class="text-red-500 hover:text-red-700">
              <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="mb-6 flex space-x-4 border-b">
          <button onclick="showAdminTab('members')" id="tab-members"
            class="px-6 py-3 font-semibold border-b-2 border-blue-500 text-blue-500">
            <i class="fas fa-users mr-2"></i>メンバー管理
          </button>
          <button onclick="showAdminTab('items')" id="tab-items"
            class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
            <i class="fas fa-list mr-2"></i>評価項目管理
          </button>
          <button onclick="showAdminTab('adjustments')" id="tab-adjustments"
            class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
            <i class="fas fa-edit mr-2"></i>採点調整
          </button>
        </div>

        <div id="admin-content"></div>
      </div>
    </div>
  `

  showAdminTab('members')
}

function showAdminTab(tab) {
  // タブのスタイル更新
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.className = 'px-6 py-3 font-semibold text-gray-500 hover:text-gray-700'
  })
  document.getElementById(`tab-${tab}`).className = 'px-6 py-3 font-semibold border-b-2 border-blue-500 text-blue-500'

  if (tab === 'members') showMembersTab()
  if (tab === 'items') showItemsTab()
  if (tab === 'adjustments') showAdjustmentsTab()
}

async function loadMembers() {
  const result = await api.get('/api/members')
  state.members = result.members
}

async function loadItems() {
  const result = await api.get('/api/items')
  state.items = result.items
}

function showMembersTab() {
  const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const membersByTeam = {}
  teams.forEach(team => {
    membersByTeam[team] = state.members.filter(m => m.team === team)
  })

  document.getElementById('admin-content').innerHTML = `
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-bold mb-4"><i class="fas fa-user-plus mr-2"></i>メンバー追加</h2>
      <form id="add-member-form" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input type="text" id="new-username" placeholder="ユーザー名" required
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <input type="text" id="new-name" placeholder="氏名" required
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <select id="new-team" required
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
          ${teams.map(t => `<option value="${t}">チーム${t}</option>`).join('')}
        </select>
        <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
          <i class="fas fa-plus mr-2"></i>追加
        </button>
      </form>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${teams.map(team => `
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-bold mb-4 text-blue-600">
            <i class="fas fa-users mr-2"></i>チーム${team} (${membersByTeam[team].length}名)
          </h3>
          <div class="space-y-2">
            ${membersByTeam[team].map(member => `
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div class="flex-1">
                  <div class="font-semibold">${member.name}</div>
                  <div class="text-sm text-gray-600">${member.username}</div>
                </div>
                ${member.role !== 'admin' ? `
                  <div class="flex items-center space-x-2">
                    <select id="team-${member.id}" class="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500">
                      ${teams.map(t => `<option value="${t}" ${t === member.team ? 'selected' : ''}>チーム${t}</option>`).join('')}
                    </select>
                    <button onclick="updateMemberTeam(${member.id}, '${member.name}')" 
                      class="text-green-600 hover:text-green-700" title="チーム変更">
                      <i class="fas fa-save"></i>
                    </button>
                    <button onclick="deleteMember(${member.id})" 
                      class="text-red-500 hover:text-red-700" title="削除">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                ` : '<span class="text-xs text-gray-500">管理者</span>'}
              </div>
            `).join('')}
            ${membersByTeam[team].length === 0 ? '<p class="text-gray-400 text-center py-4">メンバーがいません</p>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `

  document.getElementById('add-member-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = e.target.querySelector('button[type="submit"]')
    const originalHtml = btn.innerHTML
    
    try {
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>追加中...'
      
      await api.post('/api/members', {
        username: document.getElementById('new-username').value,
        name: document.getElementById('new-name').value,
        team: document.getElementById('new-team').value
      })
      await loadMembers()
      showMembersTab()
      alert('メンバーを追加しました')
    } catch (error) {
      alert(error.response?.data?.error || 'エラーが発生しました')
      btn.disabled = false
      btn.innerHTML = originalHtml
    }
  })
}

async function updateMemberTeam(id, name) {
  const select = document.getElementById(`team-${id}`)
  const newTeam = select.value
  
  if (!confirm(`${name}さんをチーム${newTeam}に移動しますか？`)) return
  
  showLoading()
  try {
    await api.put(`/api/members/${id}`, {
      name: name,
      team: newTeam
    })
    await loadMembers()
    showMembersTab()
    alert(`${name}さんをチーム${newTeam}に移動しました`)
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
  } finally {
    hideLoading()
  }
}

async function deleteMember(id) {
  if (!confirm('このメンバーを削除しますか？')) return
  
  showLoading()
  try {
    await api.delete(`/api/members/${id}`)
    await loadMembers()
    showMembersTab()
    alert('メンバーを削除しました')
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
  } finally {
    hideLoading()
  }
}

function showItemsTab() {
  // 表示順の最大値を取得（+1を自動設定）
  const maxOrder = state.items.length > 0 
    ? Math.max(...state.items.map(item => item.display_order || 0)) + 1 
    : 1

  document.getElementById('admin-content').innerHTML = `
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-bold mb-4"><i class="fas fa-plus-circle mr-2"></i>評価項目追加</h2>
      <form id="add-item-form" class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <input type="text" id="new-item-major" placeholder="大項目" required
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <input type="text" id="new-item-minor" placeholder="中項目" required
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <input type="text" id="new-item-desc" placeholder="説明"
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <input type="number" id="new-item-order" placeholder="表示順" value="${maxOrder}"
          class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
          <i class="fas fa-plus mr-2"></i>追加
        </button>
      </form>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4"><i class="fas fa-list mr-2"></i>評価項目一覧</h2>
      <div class="space-y-3">
        ${state.items.map(item => `
          <div class="p-4 bg-gray-50 rounded-lg">
            <div id="item-display-${item.id}" class="flex justify-between items-center">
              <div class="flex-1">
                <div class="font-semibold text-lg text-blue-600">${item.major_category || ''}</div>
                <div class="font-medium">${item.minor_category || ''}</div>
                <div class="text-sm text-gray-600 mt-1">${item.description || ''}</div>
                <div class="text-xs text-gray-400 mt-1">表示順: ${item.display_order}</div>
              </div>
              <div class="flex items-center space-x-2">
                <button onclick="editItem(${item.id})" 
                  class="text-blue-600 hover:text-blue-700" title="編集">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteItem(${item.id})" 
                  class="text-red-500 hover:text-red-700" title="削除">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div id="item-edit-${item.id}" class="hidden">
              <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input type="text" id="edit-major-${item.id}" value="${item.major_category || ''}" placeholder="大項目"
                  class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <input type="text" id="edit-minor-${item.id}" value="${item.minor_category || ''}" placeholder="中項目"
                  class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <input type="text" id="edit-desc-${item.id}" value="${item.description || ''}" placeholder="説明"
                  class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <input type="number" id="edit-order-${item.id}" value="${item.display_order}" placeholder="表示順"
                  class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <div class="flex space-x-2">
                  <button onclick="saveEditItem(${item.id})" 
                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex-1">
                    <i class="fas fa-save mr-1"></i>保存
                  </button>
                  <button onclick="cancelEditItem(${item.id})" 
                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex-1">
                    <i class="fas fa-times mr-1"></i>キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `

  document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = e.target.querySelector('button[type="submit"]')
    const originalHtml = btn.innerHTML
    
    try {
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>追加中...'
      
      await api.post('/api/items', {
        major_category: document.getElementById('new-item-major').value,
        minor_category: document.getElementById('new-item-minor').value,
        description: document.getElementById('new-item-desc').value,
        display_order: parseInt(document.getElementById('new-item-order').value)
      })
      await loadItems()
      showItemsTab()
      alert('評価項目を追加しました')
    } catch (error) {
      alert(error.response?.data?.error || 'エラーが発生しました')
      btn.disabled = false
      btn.innerHTML = originalHtml
    }
  })
}

function editItem(id) {
  document.getElementById(`item-display-${id}`).classList.add('hidden')
  document.getElementById(`item-edit-${id}`).classList.remove('hidden')
}

function cancelEditItem(id) {
  document.getElementById(`item-display-${id}`).classList.remove('hidden')
  document.getElementById(`item-edit-${id}`).classList.add('hidden')
}

async function saveEditItem(id) {
  showLoading()
  try {
    await api.put(`/api/items/${id}`, {
      major_category: document.getElementById(`edit-major-${id}`).value,
      minor_category: document.getElementById(`edit-minor-${id}`).value,
      description: document.getElementById(`edit-desc-${id}`).value,
      display_order: parseInt(document.getElementById(`edit-order-${id}`).value)
    })
    await loadItems()
    showItemsTab()
    alert('評価項目を更新しました')
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
  } finally {
    hideLoading()
  }
}

async function deleteItem(id) {
  if (!confirm('この評価項目を削除しますか？関連する評価データも削除されます。')) return
  
  showLoading()
  try {
    await api.delete(`/api/items/${id}`)
    await loadItems()
    showItemsTab()
    alert('評価項目を削除しました')
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
  } finally {
    hideLoading()
  }
}

async function showAdjustmentsTab(filterEvaluator = '') {
  showLoading()
  try {
    const result = await api.get('/api/admin/evaluations')
    const itemsResult = await api.get('/api/items')
    state.evaluations = result.evaluations
    state.items = itemsResult.items

    // 評価者の一覧を取得
    const evaluators = [...new Set(state.evaluations.map(ev => ev.evaluator_name))].sort()
    
    // フィルター適用
    const filteredEvals = filterEvaluator 
      ? state.evaluations.filter(ev => ev.evaluator_name === filterEvaluator)
      : state.evaluations

    // データを整形（被評価者×評価項目のマトリックス形式）
    // チーム別 → 評価者別 → 被評価者別に整理
    const byTeam = {}
    
    filteredEvals.forEach(ev => {
      const team = ev.evaluated_team
      if (!byTeam[team]) {
        byTeam[team] = {}
      }
      
      const evaluatorKey = ev.evaluator_name
      if (!byTeam[team][evaluatorKey]) {
        byTeam[team][evaluatorKey] = {}
      }
      
      const evaluatedKey = ev.evaluated_name
      if (!byTeam[team][evaluatorKey][evaluatedKey]) {
        byTeam[team][evaluatorKey][evaluatedKey] = {
          evaluated_id: ev.evaluated_id,
          items: {}
        }
      }
      
      byTeam[team][evaluatorKey][evaluatedKey].items[ev.item_id] = {
        id: ev.id,
        score: ev.score,
        item_name: ev.item_name
      }
    })

    document.getElementById('admin-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold"><i class="fas fa-edit mr-2"></i>採点調整</h2>
          <div class="flex items-center space-x-3">
            <label class="text-sm font-medium text-gray-700">
              <i class="fas fa-filter mr-2"></i>評価者で絞り込み:
            </label>
            <select id="evaluator-filter" onchange="filterAdjustments(this.value)"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">全員</option>
              ${evaluators.map(name => `
                <option value="${name}" ${name === filterEvaluator ? 'selected' : ''}>${name}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="mb-4 text-sm text-gray-600">
          <i class="fas fa-info-circle mr-2"></i>各メンバーの評価点数を調整できます
          ${filterEvaluator ? `<span class="ml-2 text-blue-600 font-semibold">（${filterEvaluator}さんの評価のみ表示中）</span>` : ''}
        </div>
        
        <div class="space-y-8">
          ${Object.keys(byTeam).sort().map(team => `
            <div>
              <h3 class="text-lg font-bold text-blue-600 mb-4">チーム${team}</h3>
              
              ${Object.keys(byTeam[team]).sort().map(evaluatorName => `
                <div class="mb-6">
                  <h4 class="text-md font-semibold text-gray-700 mb-2 pl-2 border-l-4 border-green-500">
                    <i class="fas fa-user mr-2"></i>評価者: ${evaluatorName}
                  </h4>
                  
                  <div class="overflow-x-auto">
                    <table class="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr>
                          <th class="border border-gray-300 bg-gray-700 text-white px-3 py-3 text-left sticky left-0 z-20" style="min-width: 120px;">
                            被評価者
                          </th>
                          ${state.items.map(item => `
                            <th class="border border-gray-300 bg-blue-700 text-white px-3 py-2 text-center" style="min-width: 120px;">
                              <div class="text-sm font-bold">${item.major_category}</div>
                              <div class="text-xs font-normal">${item.minor_category}</div>
                            </th>
                          `).join('')}
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.keys(byTeam[team][evaluatorName]).sort().map(evaluatedName => {
                          const member = byTeam[team][evaluatorName][evaluatedName]
                          return `
                            <tr class="hover:bg-blue-50">
                              <td class="border border-gray-300 bg-white px-3 py-2 font-semibold sticky left-0 z-10">
                                ${evaluatedName}
                              </td>
                              ${state.items.map(item => {
                                const evaluation = member.items[item.id]
                                return `
                                  <td class="border border-gray-300 bg-white px-2 py-2 text-center">
                                    ${evaluation ? `
                                      <input type="number" min="1" max="10" value="${evaluation.score}" 
                                        id="score-${evaluation.id}"
                                        onchange="updateScore(${evaluation.id})"
                                        class="w-14 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    ` : `
                                      <span class="text-gray-400 text-sm">-</span>
                                    `}
                                  </td>
                                `
                              }).join('')}
                            </tr>
                          `
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
          ${Object.keys(byTeam).length === 0 ? '<p class="text-gray-400 text-center py-8">評価データがありません</p>' : ''}
        </div>
      </div>
    `
  } finally {
    hideLoading()
  }
}

function filterAdjustments(evaluatorName) {
  showAdjustmentsTab(evaluatorName)
}

async function updateScore(id) {
  const input = document.getElementById(`score-${id}`)
  const newScore = parseInt(input.value)
  
  if (newScore < 1 || newScore > 10) {
    alert('点数は1～10の範囲で入力してください')
    return
  }

  const originalValue = input.value
  const originalBgColor = input.style.backgroundColor
  input.disabled = true
  input.style.backgroundColor = '#fef3c7' // 更新中の色
  
  try {
    await api.put(`/api/admin/evaluations/${id}`, { score: newScore })
    input.style.backgroundColor = '#d1fae5' // 成功時の色
    setTimeout(() => {
      input.style.backgroundColor = originalBgColor
    }, 1000)
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
    input.value = originalValue
    input.style.backgroundColor = originalBgColor
  } finally {
    input.disabled = false
  }
}

// ==================== 使用者画面 ====================

async function showUserDashboard() {
  // 評価項目を一度だけ読み込み
  if (state.items.length === 0) await loadItems()
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- ローディングオーバーレイ -->
      <div id="loading-overlay" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-xl">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
          <p class="mt-4 text-gray-700">読み込み中...</p>
        </div>
      </div>

      <nav class="bg-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <i class="fas fa-user text-2xl text-blue-500"></i>
              <div>
                <h1 class="text-xl font-bold text-gray-800">チーム評価システム</h1>
                <p class="text-sm text-gray-600">${state.currentUser.name}さん（チーム${state.currentUser.team}）</p>
              </div>
            </div>
            <button onclick="handleLogout()" class="text-red-500 hover:text-red-700">
              <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="mb-6 flex space-x-4 border-b">
          <button onclick="showUserTab('evaluation')" id="tab-evaluation"
            class="px-6 py-3 font-semibold border-b-2 border-blue-500 text-blue-500">
            <i class="fas fa-edit mr-2"></i>採点フォーム
          </button>
          <button onclick="showUserTab('my-results')" id="tab-my-results"
            class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
            <i class="fas fa-clipboard-list mr-2"></i>入力結果
          </button>
          <button onclick="showUserTab('summary')" id="tab-summary"
            class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
            <i class="fas fa-chart-bar mr-2"></i>集計結果
          </button>
          <button onclick="showUserTab('monthly')" id="tab-monthly"
            class="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
            <i class="fas fa-calendar-alt mr-2"></i>月次推移
          </button>
        </div>

        <div id="user-content"></div>
      </div>
    </div>
  `

  showUserTab('evaluation')
}

function showUserTab(tab) {
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.className = 'px-6 py-3 font-semibold text-gray-500 hover:text-gray-700'
  })
  document.getElementById(`tab-${tab}`).className = 'px-6 py-3 font-semibold border-b-2 border-blue-500 text-blue-500'

  if (tab === 'evaluation') showEvaluationTab()
  if (tab === 'my-results') showMyResultsTab()
  if (tab === 'summary') showSummaryTab()
  if (tab === 'monthly') showMonthlyTab()
}

async function showEvaluationTab() {
  showLoading()
  try {
    const result = await api.get('/api/team-members')
    state.teamMembers = result.members

    // 当月の評価データ
    const myEvals = await api.get('/api/evaluations/my')
    const evalMap = {}
    myEvals.evaluations.forEach(ev => {
      const key = `${ev.evaluated_id}_${ev.item_id}`
      evalMap[key] = ev.score
    })

    // 前月の評価データ
    const previousEvals = await api.get('/api/evaluations/previous')
    const previousMap = {}
    previousEvals.previousEvaluations.forEach(ev => {
      const key = `${ev.evaluated_id}_${ev.item_id}`
      previousMap[key] = ev.score
    })
    state.previousEvaluations = previousMap

    document.getElementById('user-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-xl font-bold">
              <i class="fas fa-users mr-2"></i>チームメンバー評価表
            </h2>
            <p class="text-sm text-gray-600 mt-2">
              <i class="fas fa-info-circle mr-2"></i>各項目を1～10点で評価してください（1:低い、10:高い）
            </p>
          </div>
          <div class="flex gap-3">
            ${Object.keys(previousMap).length > 0 ? `
              <button onclick="applyPreviousScores()" id="apply-previous-btn"
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-lg">
                <i class="fas fa-history mr-2"></i>前回結果を反映
              </button>
            ` : ''}
            ${state.teamMembers.length > 0 ? `
              <button onclick="saveAllEvaluations()" id="save-all-btn"
                class="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg">
                <i class="fas fa-save mr-2"></i>全て保存
              </button>
            ` : ''}
          </div>
        </div>
        
        ${state.teamMembers.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th class="border border-gray-300 bg-gray-700 text-white px-4 py-3 text-left font-bold sticky left-0 z-10">
                    被評価者
                  </th>
                  ${state.items.map(item => `
                    <th class="border border-gray-300 bg-blue-700 text-white px-4 py-3 text-center min-w-[120px]">
                      <div class="font-bold text-sm">${item.major_category || ''}</div>
                      <div class="text-xs mt-1 font-normal">${item.minor_category || ''}</div>
                    </th>
                  `).join('')}
                </tr>
                <tr>
                  <td class="border border-gray-300 bg-gray-100 px-4 py-2 text-xs text-gray-600 sticky left-0 z-10">
                    評価項目の説明
                  </td>
                  ${state.items.map(item => `
                    <td class="border border-gray-300 bg-gray-100 px-2 py-2 text-xs text-gray-600 text-center">
                      ${item.description || ''}
                    </td>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${state.teamMembers.map(member => `
                  <tr class="hover:bg-blue-50">
                    <td class="border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 sticky left-0 z-10">
                      ${member.name}
                    </td>
                    ${state.items.map(item => {
                      const key = `${member.id}_${item.id}`
                      const currentValue = evalMap[key] || ''
                      const previousValue = previousMap[key]
                      return `
                        <td class="border border-gray-300 bg-white px-2 py-2 text-center">
                          <div class="flex flex-col items-center gap-1">
                            <input type="number" min="1" max="10" 
                              value="${currentValue}"
                              placeholder="-"
                              data-member="${member.id}"
                              data-item="${item.id}"
                              data-previous="${previousValue || ''}"
                              class="evaluation-input w-16 px-2 py-2 border-2 border-gray-300 rounded text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            ${previousValue ? `
                              <span class="text-xs text-gray-500">
                                <i class="fas fa-history mr-1"></i>前回: ${previousValue}点
                              </span>
                            ` : ''}
                          </div>
                        </td>
                      `
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="flex justify-center gap-4 mt-6">
            ${Object.keys(previousMap).length > 0 ? `
              <button onclick="applyPreviousScores()"
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-lg text-lg">
                <i class="fas fa-history mr-2"></i>前回結果を反映
              </button>
            ` : ''}
            <button onclick="saveAllEvaluations()"
              class="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-lg text-lg">
              <i class="fas fa-save mr-2"></i>全て保存
            </button>
          </div>
        ` : `
          <p class="text-gray-400 text-center py-8">
            <i class="fas fa-info-circle mr-2"></i>評価対象のチームメンバーがいません
          </p>
        `}
      </div>
    `
  } finally {
    hideLoading()
  }
}

// 前回結果を一括反映
function applyPreviousScores() {
  if (!confirm('前回の評価結果を全て反映しますか？\n現在入力中の内容は上書きされます。')) {
    return
  }
  
  const inputs = document.querySelectorAll('.evaluation-input')
  inputs.forEach(input => {
    const previousValue = input.dataset.previous
    if (previousValue) {
      input.value = previousValue
    }
  })
  
  alert('前回の評価結果を反映しました')
}

async function saveAllEvaluations() {
  const inputs = document.querySelectorAll('.evaluation-input')
  const evaluations = []
  
  let hasError = false
  inputs.forEach(input => {
    const score = parseInt(input.value)
    if (input.value && (score < 1 || score > 10)) {
      hasError = true
    }
    if (score >= 1 && score <= 10) {
      evaluations.push({
        evaluated_id: parseInt(input.dataset.member),
        item_id: parseInt(input.dataset.item),
        score: score
      })
    }
  })
  
  if (hasError) {
    alert('1～10の範囲で入力してください')
    return
  }
  
  if (evaluations.length === 0) {
    alert('評価を入力してください')
    return
  }
  
  const btn = document.getElementById('save-all-btn') || event.target
  const originalHtml = btn.innerHTML
  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...'
  
  try {
    await api.post('/api/evaluations/bulk', { evaluations })
    alert(`${evaluations.length}件の評価を保存しました`)
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
  } finally {
    btn.disabled = false
    btn.innerHTML = originalHtml
  }
}

async function saveEvaluation(evaluatedId, itemId) {
  const input = document.getElementById(`score-${evaluatedId}-${itemId}`)
  const score = parseInt(input.value)
  
  if (!score || score < 1 || score > 10) {
    alert('1～10の数値を入力してください')
    return
  }

  const originalValue = input.value
  input.disabled = true

  try {
    await api.post('/api/evaluations', {
      evaluated_id: evaluatedId,
      item_id: itemId,
      score: score
    })
    alert('評価を保存しました')
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
    input.value = originalValue
  } finally {
    input.disabled = false
  }
}

async function showMyResultsTab() {
  showLoading()
  try {
    const result = await api.get('/api/evaluations/my')
    const evaluations = result.evaluations

    const byMember = {}
    evaluations.forEach(ev => {
      if (!byMember[ev.evaluated_name]) byMember[ev.evaluated_name] = []
      byMember[ev.evaluated_name].push(ev)
    })

    const currentMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
    
    document.getElementById('user-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="mb-4">
          <h2 class="text-xl font-bold">
            <i class="fas fa-clipboard-list mr-2"></i>あなたの入力結果
          </h2>
          <p class="text-sm text-gray-600 mt-2">
            <i class="fas fa-calendar-alt mr-2"></i>${currentMonth}の評価内容
          </p>
        </div>
        
        <div class="space-y-6">
          ${Object.keys(byMember).map(name => `
            <div class="border-l-4 border-blue-500 pl-4">
              <h3 class="text-lg font-bold text-blue-600 mb-3">${name}さん</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${byMember[name].map(ev => `
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span class="font-semibold">${ev.item_name}</span>
                    <span class="text-lg font-bold text-blue-600">${ev.score}点</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
          
          ${evaluations.length === 0 ? `
            <p class="text-gray-400 text-center py-8">
              <i class="fas fa-info-circle mr-2"></i>今月はまだ評価を入力していません
            </p>
          ` : ''}
        </div>
      </div>
    `
  } finally {
    hideLoading()
  }
}

async function showSummaryTab() {
  showLoading()
  try {
    const result = await api.get('/api/evaluations/summary')
    const summary = result.summary.filter(item => item.my_avg_score !== null)

    if (summary.length === 0) {
      document.getElementById('user-content').innerHTML = `
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold mb-4">
            <i class="fas fa-chart-bar mr-2"></i>あなたの評価結果
          </h2>
          <p class="text-gray-400 text-center py-8">
            <i class="fas fa-info-circle mr-2"></i>まだ評価されていません
          </p>
        </div>
      `
      return
    }

    // 自分の総合平均とチーム内総合平均を計算
    const myTotalAvg = (summary.reduce((sum, item) => sum + parseFloat(item.my_avg_score), 0) / summary.length).toFixed(1)
    const teamTotalAvg = (summary.reduce((sum, item) => sum + (item.team_avg || 0), 0) / summary.length).toFixed(1)

    document.getElementById('user-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-chart-bar mr-2"></i>あなたの評価結果
        </h2>
        <p class="text-sm text-gray-600 mb-6">
          <i class="fas fa-info-circle mr-2"></i>チームメンバーからの評価の平均点
        </p>
        
        <!-- 総合平均 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
            <div class="text-center">
              <div class="text-sm font-semibold mb-2">あなたの総合平均</div>
              <div class="text-5xl font-bold">${myTotalAvg}<span class="text-2xl">点</span></div>
              <div class="text-sm mt-2 opacity-90">10点満点</div>
            </div>
          </div>
          <div class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
            <div class="text-center">
              <div class="text-sm font-semibold mb-2">チーム内平均</div>
              <div class="text-5xl font-bold">${teamTotalAvg}<span class="text-2xl">点</span></div>
              <div class="text-sm mt-2 opacity-90">10点満点</div>
            </div>
          </div>
        </div>
        
        <!-- 折れ線グラフ -->
        <div class="mb-6">
          <h3 class="text-lg font-bold text-gray-700 mb-4">
            <i class="fas fa-chart-line mr-2"></i>項目別評価（グラフ）
          </h3>
          <div class="bg-white border rounded-lg p-4" style="height: 400px;">
            <canvas id="summaryChart"></canvas>
          </div>
        </div>
        
        <!-- 評価表 -->
        <div>
          <h3 class="text-lg font-bold text-gray-700 mb-4">
            <i class="fas fa-table mr-2"></i>項目別評価（詳細）
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr class="bg-gray-700 text-white">
                  <th class="border border-gray-300 px-4 py-3 text-left">大項目</th>
                  <th class="border border-gray-300 px-4 py-3 text-left">中項目</th>
                  <th class="border border-gray-300 px-4 py-3 text-center">チーム内平均</th>
                  <th class="border border-gray-300 px-4 py-3 text-center">あなたの平均点</th>
                  <th class="border border-gray-300 px-4 py-3 text-center">チーム内順位</th>
                </tr>
              </thead>
              <tbody>
                ${summary.map(item => {
                  const myScore = parseFloat(item.my_avg_score)
                  const teamAvg = item.team_avg ? parseFloat(item.team_avg) : 0
                  const rank = item.rank || '-'
                  const teamTotal = item.team_total || 0
                  
                  let myScoreColor = 'text-blue-600'
                  if (myScore >= 8) myScoreColor = 'text-green-600'
                  else if (myScore >= 6) myScoreColor = 'text-blue-600'
                  else if (myScore >= 4) myScoreColor = 'text-yellow-600'
                  else myScoreColor = 'text-red-600'
                  
                  let rankColor = 'text-gray-600'
                  if (rank !== '-') {
                    if (rank <= teamTotal * 0.3) rankColor = 'text-green-600'
                    else if (rank <= teamTotal * 0.7) rankColor = 'text-blue-600'
                    else rankColor = 'text-orange-600'
                  }
                  
                  return `
                    <tr class="hover:bg-blue-50">
                      <td class="border border-gray-300 px-4 py-3 font-semibold">${item.major_category || ''}</td>
                      <td class="border border-gray-300 px-4 py-3">${item.minor_category || ''}</td>
                      <td class="border border-gray-300 px-4 py-3 text-center">
                        <span class="text-lg font-bold text-gray-700">${teamAvg.toFixed(1)}</span>
                        <span class="text-sm text-gray-600">点</span>
                      </td>
                      <td class="border border-gray-300 px-4 py-3 text-center">
                        <span class="text-2xl font-bold ${myScoreColor}">${myScore.toFixed(1)}</span>
                        <span class="text-sm text-gray-600">点</span>
                      </td>
                      <td class="border border-gray-300 px-4 py-3 text-center">
                        <span class="text-xl font-bold ${rankColor}">${rank !== '-' ? rank + '位' : '-'}</span>
                        ${rank !== '-' ? `<span class="text-xs text-gray-500 block">/${teamTotal}人</span>` : ''}
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
    
    // Chart.jsで折れ線グラフを描画（自分の点数 vs チーム平均）
    const ctx = document.getElementById('summaryChart')
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: summary.map(item => `${item.major_category || ''}\n${item.minor_category || ''}`),
          datasets: [
            {
              label: 'あなたの評価点',
              data: summary.map(item => parseFloat(item.my_avg_score)),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: 'rgb(59, 130, 246)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              tension: 0.3,
              fill: true
            },
            {
              label: 'チーム内平均',
              data: summary.map(item => item.team_avg ? parseFloat(item.team_avg) : null),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderWidth: 2,
              pointBackgroundColor: 'rgb(34, 197, 94)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.3,
              fill: false,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '点'
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              ticks: {
                stepSize: 1
              },
              title: {
                display: true,
                text: '評価点（10点満点）'
              }
            },
            x: {
              title: {
                display: true,
                text: '評価項目'
              }
            }
          }
        }
      })
    }
  } finally {
    hideLoading()
  }
}

async function showMonthlyTab() {
  showLoading()
  try {
    const result = await api.get('/api/evaluations/monthly')
    const { periods, monthlyData } = result
    
    if (!periods || periods.length === 0) {
      document.getElementById('user-content').innerHTML = `
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold mb-4">
            <i class="fas fa-calendar-alt mr-2"></i>あなたの評価推移
          </h2>
          <p class="text-gray-400 text-center py-8">
            <i class="fas fa-info-circle mr-2"></i>まだ評価データがありません
          </p>
        </div>
      `
      return
    }
    
    // データを整形（項目別に月次データを集約）
    const itemMap = {}
    monthlyData.forEach(data => {
      if (!itemMap[data.item_id]) {
        itemMap[data.item_id] = {
          id: data.item_id,
          name: data.item_name,
          major: data.major_category,
          minor: data.minor_category,
          months: {}
        }
      }
      itemMap[data.item_id].months[data.year_month] = parseFloat(data.avg_score).toFixed(1)
    })
    
    const items = Object.values(itemMap)
    
    // 総合平均データを計算
    const avgData = periods.map(p => {
      const periodItems = items.filter(item => item.months[p.year_month])
      if (periodItems.length === 0) return null
      return (periodItems.reduce((sum, item) => sum + parseFloat(item.months[p.year_month]), 0) / periodItems.length)
    })
    
    document.getElementById('user-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-calendar-alt mr-2"></i>あなたの評価推移
        </h2>
        <p class="text-sm text-gray-600 mb-6">
          <i class="fas fa-info-circle mr-2"></i>過去の評価結果と比較できます
        </p>
        
        <!-- 総合平均の折れ線グラフ -->
        <div class="mb-6">
          <h3 class="text-lg font-bold text-gray-700 mb-4">
            <i class="fas fa-chart-line mr-2"></i>総合平均の推移（グラフ）
          </h3>
          <div class="bg-white border rounded-lg p-4" style="height: 300px;">
            <canvas id="monthlyAvgChart"></canvas>
          </div>
        </div>
        
        <!-- 項目別推移の折れ線グラフ -->
        <div class="mb-6">
          <h3 class="text-lg font-bold text-gray-700 mb-4">
            <i class="fas fa-chart-line mr-2"></i>項目別評価の推移（グラフ）
          </h3>
          <div class="bg-white border rounded-lg p-4" style="height: 400px;">
            <canvas id="monthlyItemsChart"></canvas>
          </div>
        </div>
        
        <!-- 詳細データ表 -->
        <div>
          <h3 class="text-lg font-bold text-gray-700 mb-4">
            <i class="fas fa-table mr-2"></i>項目別評価の推移（詳細）
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th class="border border-gray-300 bg-gray-700 text-white px-4 py-3 text-left sticky left-0 z-10" style="min-width: 150px;">
                    評価項目
                  </th>
                  ${periods.map(p => `
                    <th class="border border-gray-300 bg-blue-700 text-white px-4 py-3 text-center min-w-[120px]">
                      ${p.year_month}
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr class="hover:bg-blue-50">
                    <td class="border border-gray-300 bg-white px-4 py-3 sticky left-0 z-10">
                      <div class="font-semibold text-sm text-blue-600">${item.major}</div>
                      <div class="text-sm text-gray-600">${item.minor}</div>
                    </td>
                    ${periods.map(p => {
                      const score = item.months[p.year_month] || '-'
                      const prevPeriod = periods[periods.indexOf(p) + 1]
                      const prevScore = prevPeriod ? item.months[prevPeriod.year_month] : null
                      let trendIcon = ''
                      let trendColor = 'text-gray-800'
                      
                      if (score !== '-' && prevScore && prevScore !== '-') {
                        const diff = parseFloat(score) - parseFloat(prevScore)
                        if (diff > 0) {
                          trendIcon = '<i class="fas fa-arrow-up text-green-500 ml-2"></i>'
                          trendColor = 'text-green-600'
                        } else if (diff < 0) {
                          trendIcon = '<i class="fas fa-arrow-down text-red-500 ml-2"></i>'
                          trendColor = 'text-red-600'
                        } else {
                          trendIcon = '<i class="fas fa-minus text-gray-400 ml-2"></i>'
                        }
                      }
                      
                      return `
                        <td class="border border-gray-300 bg-white px-4 py-3 text-center">
                          <span class="text-lg font-bold ${trendColor}">${score}${score !== '-' ? '点' : ''}</span>${trendIcon}
                        </td>
                      `
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
    
    // 総合平均の折れ線グラフ
    const avgCtx = document.getElementById('monthlyAvgChart')
    if (avgCtx) {
      new Chart(avgCtx, {
        type: 'line',
        data: {
          labels: periods.map(p => p.year_month).reverse(),
          datasets: [{
            label: '総合平均',
            data: avgData.reverse(),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return '総合平均: ' + context.parsed.y.toFixed(1) + '点'
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              ticks: {
                stepSize: 1
              },
              title: {
                display: true,
                text: '評価点（10点満点）'
              }
            },
            x: {
              title: {
                display: true,
                text: '年月'
              }
            }
          }
        }
      })
    }
    
    // 項目別の折れ線グラフ
    const itemsCtx = document.getElementById('monthlyItemsChart')
    if (itemsCtx) {
      const colors = [
        'rgb(59, 130, 246)',   // blue
        'rgb(16, 185, 129)',   // green
        'rgb(245, 158, 11)',   // yellow
        'rgb(239, 68, 68)',    // red
        'rgb(139, 92, 246)',   // purple
        'rgb(236, 72, 153)',   // pink
        'rgb(20, 184, 166)',   // teal
      ]
      
      new Chart(itemsCtx, {
        type: 'line',
        data: {
          labels: periods.map(p => p.year_month).reverse(),
          datasets: items.map((item, index) => ({
            label: `${item.major} - ${item.minor}`,
            data: periods.map(p => item.months[p.year_month] ? parseFloat(item.months[p.year_month]) : null).reverse(),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '点'
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              ticks: {
                stepSize: 1
              },
              title: {
                display: true,
                text: '評価点（10点満点）'
              }
            },
            x: {
              title: {
                display: true,
                text: '年月'
              }
            }
          }
        }
      })
    }
  } finally {
    hideLoading()
  }
}

// ==================== 初期化 ====================

async function init() {
  try {
    const result = await api.get('/api/me')
    state.currentUser = result.user
    
    if (result.user.role === 'admin') {
      await showAdminDashboard()
    } else {
      await showUserDashboard()
    }
  } catch (error) {
    showLoginScreen()
  }
}

// グローバル関数をwindowに登録
window.handleLogout = handleLogout
window.showAdminTab = showAdminTab
window.showUserTab = showUserTab
window.updateMemberTeam = updateMemberTeam
window.deleteMember = deleteMember
window.editItem = editItem
window.saveEditItem = saveEditItem
window.cancelEditItem = cancelEditItem
window.deleteItem = deleteItem
window.filterAdjustments = filterAdjustments
window.updateScore = updateScore
window.saveAllEvaluations = saveAllEvaluations
window.saveEvaluation = saveEvaluation

// アプリ起動
init()
