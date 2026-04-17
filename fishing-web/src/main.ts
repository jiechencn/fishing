import './style.css'
import 'github-markdown-css/github-markdown.css'
import { marked } from 'marked'
import { login, logout, getAccount, getAccessToken } from './auth'

const API_BASE = import.meta.env.DEV ? 'https://localhost:7292' : 'https://fishingapi.azurewebsites.net'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const i18n = {
  en: {
    title: 'Fishing Agent',
    welcomeDesc: 'Your AI-powered fishing assistant. Here is what I can do:',
    tools: [
      'Query and manage fish species',
      'Query and manage fishing activities',
      'Look up weather and geo location',
      'Summarize fishing experience',
      'Forecast fishing luck based on weather, location and past experience, give recommendations of skill',
    ],
    placeholder: 'Message the fishing agent...',
    you: 'I',
    agent: 'Fishing Agent',
    error: 'Sorry, something went wrong. Please try again.',
    connectError: 'Could not connect to the server. Make sure the API is running.',
    attachPhoto: 'Attach photo',
    photoUploaded: 'Photo uploaded successfully.',
    photoUploadFailed: 'Failed to upload photo.',
    loginRequired: 'Please sign in first to use the fishing assistant.',
    examples: [
      'Add a species "Bass" with description "Freshwater fish"',
      'Show all species',
      'Add a fishing activity for Bass at Lake Tahoe',
      'Show all activities',
    ]
  },
  zh: {
    title: '路亚圣手',
    welcomeDesc: 'Jie的私人AI助理，我可以：',
    tools: [
      '管理鱼种习性',
      '记录出钓活动',
      '查询天气和钓点位置',
      '总结经验',
      '预测鱼情并推荐钓法',
    ],
    placeholder: '向路亚圣手发送消息...',
    you: '我',
    agent: '路亚圣手',
    error: '抱歉，出了点问题，请重试。',
    connectError: '无法连接服务器，请确保 API 已启动。',
    attachPhoto: '附加照片',
    photoUploaded: '照片上传成功。',
    photoUploadFailed: '照片上传失败。',
    loginRequired: '这是Jie的私人AI助理，请先登录。',
    examples: [
      '添加鱼种，描述它的特征和习性',
      '显示所有本地路亚鱼种',
      '添加一条在阳澄湖钓翘嘴的活动记录',
      '显示所有出钓活动记录',
      '看看这个月的渔获',
      '总结这半年的经验教训',
      '分析本周的作钓最佳时机',
      '在阳澄湖路亚的推荐手法',
    ]
  }
}

type Lang = keyof typeof i18n
let currentLang: Lang = (localStorage.getItem('lang') as Lang) || 'zh'

function t() { return i18n[currentLang] }

const history: ChatMessage[] = []
let isLoading = false
let selectedFile: File | null = null

const app = document.querySelector<HTMLDivElement>('#app')!

async function renderApp() {
  const lang = t()
  app.innerHTML = `
  <div class="header">
    <svg class="header-icon" viewBox="0 0 64 64" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 28 C2 24 -2 20 4 16 C10 12 4 8 2 4" stroke="#999" stroke-width="0.5" fill="none"/>
      <circle cx="8" cy="32" r="3" stroke="#999" stroke-width="1.5"/>
      <path d="M12 32 Q20 24 32 24 Q46 24 50 32 Q46 40 32 40 Q20 40 12 32Z" fill="white" stroke="#666"/>
      <path d="M12 32 Q16 26 22 26 Q26 26 26 32 Q26 38 22 38 Q16 38 12 32Z" fill="#ef4444" opacity="0.8" stroke="#ef4444"/>
      <path d="M26 34 Q38 38 48 34" stroke="#ccc" stroke-width="1.5"/>
      <line x1="30" y1="25" x2="32" y2="30" stroke="#ddd" stroke-width="1.5"/>
      <line x1="36" y1="24.5" x2="38" y2="30" stroke="#ddd" stroke-width="1.5"/>
      <line x1="42" y1="25.5" x2="43" y2="30" stroke="#ddd" stroke-width="1.5"/>
      <path d="M50 32 L58 24 L58 40 Z" fill="#ef4444" opacity="0.3" stroke="#ef4444"/>
      <circle cx="18" cy="31" r="2.5" fill="white" stroke="#333"/>
      <circle cx="18.5" cy="31" r="1" fill="#333"/>
      <line x1="24" y1="40" x2="24" y2="44" stroke="#999" stroke-width="1"/>
      <path d="M24 44 Q24 49 20 49 Q17 47 20 44" stroke="#ef4444" stroke-width="1.2"/>
      <path d="M24 44 Q24 49 28 49 Q31 47 28 44" stroke="#ef4444" stroke-width="1.2"/>
      <line x1="42" y1="40" x2="42" y2="44" stroke="#999" stroke-width="1"/>
      <path d="M42 44 Q42 49 38 49 Q35 47 38 44" stroke="#ef4444" stroke-width="1.2"/>
      <path d="M42 44 Q42 49 46 49 Q49 47 46 44" stroke="#ef4444" stroke-width="1.2"/>
      <path d="M12 32 L6 38" stroke="#2563eb" stroke-width="2.5"/>
    </svg>
    <h1>${lang.title} <span class="version" id="version"></span></h1>
    <div class="auth-area" id="auth-area"></div>
  </div>
  <div class="messages" id="messages">
    <div class="welcome">
      <svg class="welcome-icon" viewBox="0 0 64 64" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 28 C2 24 -2 20 4 16 C10 12 4 8 2 4" stroke="#999" stroke-width="0.5" fill="none"/>
        <circle cx="8" cy="32" r="3" stroke="#999" stroke-width="1.5"/>
        <path d="M12 32 Q20 24 32 24 Q46 24 50 32 Q46 40 32 40 Q20 40 12 32Z" fill="white" stroke="#666"/>
        <path d="M12 32 Q16 26 22 26 Q26 26 26 32 Q26 38 22 38 Q16 38 12 32Z" fill="#ef4444" opacity="0.8" stroke="#ef4444"/>
        <path d="M26 34 Q38 38 48 34" stroke="#ccc" stroke-width="1.5"/>
        <line x1="30" y1="25" x2="32" y2="30" stroke="#ddd" stroke-width="1.5"/>
        <line x1="36" y1="24.5" x2="38" y2="30" stroke="#ddd" stroke-width="1.5"/>
        <line x1="42" y1="25.5" x2="43" y2="30" stroke="#ddd" stroke-width="1.5"/>
        <path d="M50 32 L58 24 L58 40 Z" fill="#ef4444" opacity="0.3" stroke="#ef4444"/>
        <circle cx="18" cy="31" r="2.5" fill="white" stroke="#333"/>
        <circle cx="18.5" cy="31" r="1" fill="#333"/>
        <line x1="24" y1="40" x2="24" y2="44" stroke="#999" stroke-width="1"/>
        <path d="M24 44 Q24 49 20 49 Q17 47 20 44" stroke="#ef4444" stroke-width="1.2"/>
        <path d="M24 44 Q24 49 28 49 Q31 47 28 44" stroke="#ef4444" stroke-width="1.2"/>
        <line x1="42" y1="40" x2="42" y2="44" stroke="#999" stroke-width="1"/>
        <path d="M42 44 Q42 49 38 49 Q35 47 38 44" stroke="#ef4444" stroke-width="1.2"/>
        <path d="M42 44 Q42 49 46 49 Q49 47 46 44" stroke="#ef4444" stroke-width="1.2"/>
        <path d="M12 32 L6 38" stroke="#2563eb" stroke-width="2.5"/>
      </svg>
      <h2>${lang.title}</h2>
      <p>${lang.welcomeDesc}</p>
      <div class="tools-list">
        ${lang.tools.map(tool => `<div class="tool-item">${tool}</div>`).join('')}
      </div>
    </div>
  </div>
  <div class="input-area">
    <div class="input-examples" id="input-examples">
      <span class="input-examples-label">试试</span>
      <button class="input-example-btn">${lang.examples[0]}</button>
      <button class="input-examples-close" id="input-examples-close">&times;</button>
    </div>
    <div id="file-indicator" class="file-indicator" style="display:none"></div>
    <div class="input-wrapper">
      <input type="file" id="file-input" accept="image/*" style="display:none">
      <button id="attach-btn" class="attach-btn" aria-label="${lang.attachPhoto}" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      </button>
      <textarea id="input" placeholder="${lang.placeholder}" rows="1"></textarea>
      <button id="send-btn" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
`
  bindEvents()
  fetchVersion()
  await renderAuthUI()
}

async function renderAuthUI() {
  const authArea = document.getElementById('auth-area')
  if (!authArea) return
  const account = await getAccount()
  if (account) {
    authArea.innerHTML = `
      <span class="auth-user">${account.name || account.username}</span>
      <button class="auth-btn" id="logout-btn">Logout</button>
    `
    document.getElementById('logout-btn')!.addEventListener('click', async () => {
      await logout()
      renderApp()
    })
  } else {
    authArea.innerHTML = `<button class="auth-btn auth-login" id="login-btn">Login</button>`
    document.getElementById('login-btn')!.addEventListener('click', async () => {
      await login()
      renderApp()
    })
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  if (token) {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }
  return { 'Content-Type': 'application/json' }
}

async function fetchVersion() {
  try {
    const res = await fetch(`${API_BASE}/api/about`)
    if (res.ok) {
      const data = await res.json()
      const el = document.getElementById('version')
      if (el) el.textContent = `v${data.version}`
    }
  } catch { /* ignore */ }
}

function bindEvents() {
  const messagesEl = document.getElementById('messages')!
  const inputEl = document.getElementById('input') as HTMLTextAreaElement
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement
  const attachBtn = document.getElementById('attach-btn') as HTMLButtonElement
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const fileIndicator = document.getElementById('file-indicator') as HTMLDivElement

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto'
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px'
  })

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(messagesEl, inputEl, sendBtn)
    }
  })

  sendBtn.addEventListener('click', () => sendMessage(messagesEl, inputEl, sendBtn))

  attachBtn.addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) {
      selectedFile = file
      fileIndicator.style.display = 'flex'
      fileIndicator.innerHTML = `
        <span class="file-name">${escapeHtml(file.name)}</span>
        <button class="file-remove" type="button">&times;</button>
      `
      fileIndicator.querySelector('.file-remove')!.addEventListener('click', () => {
        selectedFile = null
        fileInput.value = ''
        fileIndicator.style.display = 'none'
      })
    }
  })

  document.querySelectorAll('.input-example-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent ?? ''
      sendMessage(messagesEl, inputEl, sendBtn)
    })
  })

  document.getElementById('input-examples-close')?.addEventListener('click', () => {
    document.getElementById('input-examples')?.remove()
  })

  const exampleBtn = document.querySelector('.input-examples .input-example-btn') as HTMLElement | null
  const examples = t().examples
  if (exampleBtn && examples.length > 1) {
    let idx = 0
    setInterval(() => {
      idx = (idx + 1) % examples.length
      exampleBtn.classList.add('fade-out')
      setTimeout(() => {
        exampleBtn.textContent = examples[idx]
        exampleBtn.classList.remove('fade-out')
      }, 300)
    }, 3000)
  }

}

function renderAssistantContent(content: string): string {
  // marked already handles markdown images ![alt](url), so just parse directly
  // Then post-process: convert any remaining standalone image URLs to <img> tags
  let html = marked.parse(content) as string
  // Convert standalone blob/image URLs that are not already inside <img> or <a> tags
  html = html.replace(
    /(?<!src="|href=")(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp))/gi,
    '<img class="chat-image" src="$1" alt="">'
  )
  return html
}

function addMessageToUI(messagesEl: HTMLElement, role: 'user' | 'assistant', content: string) {
  const welcome = messagesEl.querySelector('.welcome')
  if (welcome) welcome.remove()

  const lang = t()
  const div = document.createElement('div')
  div.className = `message ${role}`

  const avatarLabel = role === 'user' ? 'I' : '🪝'

  div.innerHTML = `
    <div class="avatar">${avatarLabel}</div>
    <div class="content">
      <div class="role">${role === 'user' ? lang.you : lang.agent}</div>
      <div class="text ${role === 'assistant' ? 'markdown-body' : ''}">${role === 'assistant' ? renderAssistantContent(content) : escapeHtml(content)}</div>
    </div>
  `
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
  return div
}

function addImageToUI(messagesEl: HTMLElement, imageUrl: string) {
  const div = document.createElement('div')
  div.className = 'message assistant'
  div.innerHTML = `
    <div class="avatar">🪝</div>
    <div class="content">
      <img class="chat-image" src="${imageUrl}" alt="Activity photo">
    </div>
  `
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function showThinking(messagesEl: HTMLElement): HTMLDivElement {
  const welcome = messagesEl.querySelector('.welcome')
  if (welcome) welcome.remove()

  const lang = t()
  const div = document.createElement('div')
  div.className = 'message assistant'
  div.id = 'thinking'
  div.innerHTML = `
    <div class="avatar">🪝</div>
    <div class="content">
      <div class="role">${lang.agent}</div>
      <div class="thinking"><span></span><span></span><span></span></div>
    </div>
  `
  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
  return div
}

function removeThinking() {
  document.getElementById('thinking')?.remove()
}

async function uploadPhoto(activityId: string, file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const token = await getAccessToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/api/chat/upload-image/${activityId}`, {
      method: 'POST',
      headers,
      body: formData
    })
    if (res.ok) {
      const data = await res.json()
      return data.imageLink
    }
    return null
  } catch {
    return null
  }
}

async function sendMessage(messagesEl: HTMLElement, inputEl: HTMLTextAreaElement, sendBtn: HTMLButtonElement) {
  const text = inputEl.value.trim()
  if (!text || isLoading) return

  const lang = t()
  const pendingFile = selectedFile
  isLoading = true
  sendBtn.disabled = true
  inputEl.value = ''
  inputEl.style.height = 'auto'

  addMessageToUI(messagesEl, 'user', text)
  showThinking(messagesEl)

  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: text, history })
    })

    removeThinking()

    if (res.status === 401) {
      addMessageToUI(messagesEl, 'assistant', lang.loginRequired)
    } else if (!res.ok) {
      addMessageToUI(messagesEl, 'assistant', lang.error)
    } else {
      const data = await res.json()
      const reply = data.reply
      addMessageToUI(messagesEl, 'assistant', reply)

      history.push({ role: 'user', content: text })
      history.push({ role: 'assistant', content: reply })

      // Keep only last 20 messages to avoid token limit
      if (history.length > 20) {
        history.splice(0, history.length - 20)
      }

      // Auto-upload photo if a file was attached and an activity was created
      if (pendingFile) {
        const match = reply.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
        if (match) {
          const activityId = match[0]
          const imageUrl = await uploadPhoto(activityId, pendingFile)
          if (imageUrl) {
            addMessageToUI(messagesEl, 'assistant', lang.photoUploaded)
            addImageToUI(messagesEl, imageUrl)
          } else {
            addMessageToUI(messagesEl, 'assistant', lang.photoUploadFailed)
          }
        }
        // Clear file state
        selectedFile = null
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        const fileIndicator = document.getElementById('file-indicator') as HTMLDivElement
        fileInput.value = ''
        fileIndicator.style.display = 'none'
      }
    }
  } catch {
    removeThinking()
    addMessageToUI(messagesEl, 'assistant', lang.connectError)
  }

  isLoading = false
  sendBtn.disabled = false
  inputEl.focus()
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

renderApp()
