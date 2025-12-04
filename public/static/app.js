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
          
          <div id="password-field" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="fas fa-lock mr-2"></i>パスワード
            </label>
            <input type="password" id="password"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <button type="submit"
            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
            <i class="fas fa-sign-in-alt mr-2"></i>ログイン
          </button>
        </form>
        
        <div class="mt-6 text-center text-sm text-gray-600">
          <p>管理者: admin / admin</p>
          <p>使用者: 登録されたユーザー名</p>
        </div>
      </div>
    </div>
  `

  // ユーザー名入力で管理者判定
  document.getElementById('username').addEventListener('input', (e) => {
    const passwordField = document.getElementById('password-field')
    if (e.target.value === 'admin') {
      passwordField.classList.remove('hidden')
      document.getElementById('password').required = true
    } else {
      passwordField.classList.add('hidden')
      document.getElementById('password').required = false
    }
  })

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
        <input type="number" id="new-item-order" placeholder="表示順" value="999"
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

async function showAdjustmentsTab() {
  showLoading()
  try {
    const result = await api.get('/api/admin/evaluations')
    state.evaluations = result.evaluations

    const byTeam = {}
    state.evaluations.forEach(ev => {
      if (!byTeam[ev.evaluated_team]) byTeam[ev.evaluated_team] = []
      byTeam[ev.evaluated_team].push(ev)
    })

    document.getElementById('admin-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4"><i class="fas fa-edit mr-2"></i>採点調整</h2>
        <div class="mb-4 text-sm text-gray-600">
          <i class="fas fa-info-circle mr-2"></i>各メンバーの評価点数を調整できます
        </div>
        
        <div class="space-y-6">
          ${Object.keys(byTeam).sort().map(team => `
            <div>
              <h3 class="text-lg font-bold text-blue-600 mb-3">チーム${team}</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full border">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="px-4 py-2 border text-left">評価者</th>
                      <th class="px-4 py-2 border text-left">被評価者</th>
                      <th class="px-4 py-2 border text-left">評価項目</th>
                      <th class="px-4 py-2 border text-center">点数</th>
                      <th class="px-4 py-2 border text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${byTeam[team].map(ev => `
                      <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 border">${ev.evaluator_name}</td>
                        <td class="px-4 py-2 border">${ev.evaluated_name}</td>
                        <td class="px-4 py-2 border">${ev.item_name}</td>
                        <td class="px-4 py-2 border text-center">
                          <input type="number" min="1" max="10" value="${ev.score}" 
                            id="score-${ev.id}"
                            class="w-16 px-2 py-1 border rounded text-center">
                        </td>
                        <td class="px-4 py-2 border text-center">
                          <button onclick="updateScore(${ev.id})" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                            <i class="fas fa-save mr-1"></i>更新
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
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

async function updateScore(id) {
  const input = document.getElementById(`score-${id}`)
  const newScore = parseInt(input.value)
  
  if (newScore < 1 || newScore > 10) {
    alert('点数は1～10の範囲で入力してください')
    return
  }

  const originalValue = input.value
  input.disabled = true
  
  try {
    await api.put(`/api/admin/evaluations/${id}`, { score: newScore })
    alert('点数を更新しました')
  } catch (error) {
    alert(error.response?.data?.error || 'エラーが発生しました')
    input.value = originalValue
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
}

async function showEvaluationTab() {
  showLoading()
  try {
    const result = await api.get('/api/team-members')
    state.teamMembers = result.members

    const myEvals = await api.get('/api/evaluations/my')
    const evalMap = {}
    myEvals.evaluations.forEach(ev => {
      const key = `${ev.evaluated_id}_${ev.item_id}`
      evalMap[key] = ev.score
    })

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
          ${state.teamMembers.length > 0 ? `
            <button onclick="saveAllEvaluations()" id="save-all-btn"
              class="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg">
              <i class="fas fa-save mr-2"></i>全て保存
            </button>
          ` : ''}
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
                    ${state.items.map(item => `
                      <td class="border border-gray-300 bg-white px-2 py-2 text-center">
                        <input type="number" min="1" max="10" 
                          value="${evalMap[`${member.id}_${item.id}`] || ''}"
                          placeholder="-"
                          data-member="${member.id}"
                          data-item="${item.id}"
                          class="evaluation-input w-16 px-2 py-2 border-2 border-gray-300 rounded text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="flex justify-center mt-6">
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

    document.getElementById('user-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-clipboard-list mr-2"></i>あなたの入力結果
        </h2>
        
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
              <i class="fas fa-info-circle mr-2"></i>まだ評価を入力していません
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
    const summary = result.summary

    const byMember = {}
    summary.forEach(item => {
      if (!byMember[item.name]) {
        byMember[item.name] = { name: item.name, items: [], total: 0, count: 0 }
      }
      if (item.item_name) {
        byMember[item.name].items.push({
          name: item.item_name,
          avg: parseFloat(item.avg_score).toFixed(1),
          count: item.count
        })
        byMember[item.name].total += parseFloat(item.avg_score)
        byMember[item.name].count++
      }
    })

    const members = Object.values(byMember).filter(m => m.count > 0)
    members.forEach(m => {
      m.average = (m.total / m.count).toFixed(1)
    })

    document.getElementById('user-content').innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-chart-bar mr-2"></i>チーム${state.currentUser.team} 集計結果
        </h2>
        <p class="text-sm text-gray-600 mb-6">
          <i class="fas fa-info-circle mr-2"></i>チームメンバーの平均評価点
        </p>
        
        <div class="space-y-6">
          ${members.map(member => `
            <div class="border rounded-lg p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-blue-600">
                  <i class="fas fa-user mr-2"></i>${member.name}さん
                </h3>
                <div class="text-right">
                  <div class="text-sm text-gray-600">総合平均</div>
                  <div class="text-2xl font-bold text-blue-600">${member.average}点</div>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${member.items.map(item => `
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div class="font-semibold">${item.name}</div>
                      <div class="text-xs text-gray-500">${item.count}件の評価</div>
                    </div>
                    <span class="text-lg font-bold text-blue-600">${item.avg}点</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
          
          ${members.length === 0 ? `
            <p class="text-gray-400 text-center py-8">
              <i class="fas fa-info-circle mr-2"></i>まだ評価データがありません
            </p>
          ` : ''}
        </div>
      </div>
    `
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
window.updateScore = updateScore
window.saveAllEvaluations = saveAllEvaluations
window.saveEvaluation = saveEvaluation

// アプリ起動
init()
