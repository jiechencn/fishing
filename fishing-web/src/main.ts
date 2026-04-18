import './style.css'
import 'github-markdown-css/github-markdown.css'
import { marked } from 'marked'
import { login, logout, getAccount, getAccessToken } from './auth'

const API_BASE = import.meta.env.DEV ? 'https://localhost:7292' : 'https://fishingapi.azurewebsites.net'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface LocationItem {
  locationName: string
  locationMap: string
  imageLink: string
  dateTime: string
  fishType: string
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
    locationsTitle: 'Locations',
    noLocations: 'No locations recorded.',
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
    locationsTitle: '钓点记录',
    noLocations: '暂无出钓记录。',
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
let locationCarouselTimer: ReturnType<typeof setInterval> | null = null

const app = document.querySelector<HTMLDivElement>('#app')!

async function renderApp() {
  const lang = t()
  app.innerHTML = `
  <div class="header">
    <div class="icon-wrap" id="icon-wrap">
      <img src="/icon.png" class="header-icon" alt="fishing icon" />
      <div class="version-tooltip" id="version-tooltip">v...</div>
    </div>
    <h1>${lang.title}</h1>
    <div class="auth-area" id="auth-area"></div>
  </div>
  <div class="messages" id="messages">
    <div class="welcome">
      <div class="locations-section">
        <div class="locations-grid" id="locations-list">
          <div class="locations-loading">···</div>
        </div>
      </div>
      <div id="fishing-map"></div>
      <div id="map-loading">
        <div class="map-loading-content">
          <img src="/icon.png" class="map-loading-icon" alt="fishing icon" />
          <div class="map-spinner"></div>
        </div>
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
  loadLocations()
  initLocaMap()
}

async function fetchLocations(): Promise<LocationItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/activities`)
    if (res.ok) return await res.json()
  } catch { /* ignore */ }
  return []
}

function renderLocationCard(item: LocationItem, cls: string): string {
  const date = new Date(item.dateTime)
  const dateStr = date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric' })
  const thumbHtml = item.imageLink
    ? `<img class="location-map" src="${item.imageLink}" alt="">`
    : item.locationMap
      ? `<img class="location-map" src="${item.locationMap}" alt="">`
      : `<div class="location-map-placeholder">📍</div>`
  return `
    <div class="location-card ${cls}">
      ${thumbHtml}
      <div class="location-info">
        <div class="location-name">${escapeHtml(item.locationName)}</div>
        <div class="location-meta">${escapeHtml(item.fishType)} · ${dateStr}</div>
      </div>
    </div>`
}

async function loadLocations() {
  if (locationCarouselTimer) {
    clearInterval(locationCarouselTimer)
    locationCarouselTimer = null
  }
  const container = document.getElementById('locations-list')
  if (!container) return
  const items = await fetchLocations()
  if (items.length === 0) {
    container.innerHTML = `<span class="locations-empty">${t().noLocations}</span>`
    return
  }
  let idx = 0
  container.innerHTML = renderLocationCard(items[0], 'lc-enter')
  if (items.length > 1) {
    locationCarouselTimer = setInterval(() => {
      const el = document.getElementById('locations-list')
      if (!el) { clearInterval(locationCarouselTimer!); locationCarouselTimer = null; return }
      const current = el.querySelector('.location-card')
      if (current) current.classList.replace('lc-enter', 'lc-leave')
      setTimeout(() => {
        const el2 = document.getElementById('locations-list')
        if (!el2) return
        idx = (idx + 1) % items.length
        el2.innerHTML = renderLocationCard(items[idx], 'lc-enter')
      }, 400)
    }, 3000)
  }
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

function showApiError() {
  const el = document.getElementById('map-loading')
  if (!el) return
  el.innerHTML = `
    <div style="text-align:center;color:#fff;padding:32px 24px">
      <img src="/icon.png" style="width:48px;height:48px;transform:rotate(-15deg);opacity:0.6;margin-bottom:16px" />
      <p style="font-size:16px;font-weight:600;margin-bottom:8px">鱼儿都跑了</p>
      <p style="font-size:13px;color:#888;margin-bottom:20px">联系一下主人吧</p>
      <button onclick="location.reload()" style="padding:8px 24px;background:#f97316;border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:14px;font-family:inherit">再试一次</button>
    </div>
  `
}

async function fetchVersion() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${API_BASE}/api/about`, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      const el = document.getElementById('version-tooltip')
      if (el) el.textContent = `v${(data.version as string).split('+')[0]}`
      if (data.jsApiKey) initAmap(data.jsApiKey)
    } else {
      showApiError()
    }
  } catch {
    showApiError()
  }
}

function initAmap(jsApiKey: string) {
  if (document.querySelector('script[data-amap]')) return
  ;(window as any)._AMapSecurityConfig = { serviceHost: `${API_BASE}/_AMapService` }

  ;(window as any)._onAMapLoaded = () => {
    const locaScript = document.createElement('script')
    locaScript.setAttribute('data-loca', '1')
    locaScript.src = `https://webapi.amap.com/loca?v=2.0.0&key=${encodeURIComponent(jsApiKey)}`
    locaScript.onload = () => initLocaMap()
    document.head.appendChild(locaScript)
  }

  const amapScript = document.createElement('script')
  amapScript.setAttribute('data-amap', '1')
  amapScript.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(jsApiKey)}&callback=_onAMapLoaded`
  document.head.appendChild(amapScript)
}

function emojiToDataUrl(emoji: string, size = 48, circleColor?: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  if (circleColor) {
    const r = size / 2 - 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2)
    ctx.strokeStyle = circleColor
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.font = `${size * 0.7}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, size / 2, size / 2)
  return canvas.toDataURL()
}

let _amapInstance: any = null

function initLocaMap() {
  const AMap = (window as any).AMap
  const Loca = (window as any).Loca
  if (!AMap || !Loca) return

  const container = document.getElementById('fishing-map')
  if (!container) return

  if (_amapInstance) { _amapInstance.destroy(); _amapInstance = null }

  const map = new AMap.Map('fishing-map', {
    zoom: 11,
    showLabel: false,
    viewMode: '3D',
    center: [120.72, 31.36],
    mapStyle: 'amap://styles/28f5f1e7774710f2d218ab9ba738b444',
  })
  _amapInstance = map

  map.setLimitBounds(new AMap.Bounds([120.54, 31.24], [120.85, 31.55]))

  map.on('complete', () => {
    const el = document.getElementById('map-loading')
    if (el) el.classList.add('map-loading-done')
  })

  const loca = new Loca.Container({ map })

  const labelsLayer = new Loca.LabelsLayer({ zooms: [3, 20] })

  const geo = new Loca.GeoJSONSource({
    url: `${API_BASE}/api/activities/geojson`,
  })

  labelsLayer.setSource(geo)
  labelsLayer.setStyle({
    icon: {
      type: 'image',
      image: emojiToDataUrl('🐟', 48, '#f97316'),
      size: [40, 40],
      anchor: 'center',
    },
    text: {
      content: (_: number, feature: any) => feature.properties.name,
      style: {
        fontSize: 12,
        fontWeight: 'normal',
        fillColor: '#fff',
        strokeColor: '#000',
        strokeWidth: 2,
        backgroundColor: '#000',
        padding: [2, 6],
        borderRadius: 4,
      },
      direction: 'bottom',
    },
    extData: (_: number, feature: any) => feature.properties,
  })

  loca.add(labelsLayer)

  labelsLayer.on('complete', () => {
    const normalMarker = new AMap.Marker({ offset: [70, -15] })
    const labelMarkers = labelsLayer.getLabelsLayer().getAllOverlays()
    for (const marker of labelMarkers) {
      marker.on('mouseover', (e: any) => {
        if (!e.target.getCollision()) {
          const position = e.data.data && e.data.data.position
          if (position) {
            normalMarker.setContent(
              '<div class="amap-info-window" style="white-space:nowrap;padding:4px 8px;background:#000;color:#fff;border-radius:4px;font-size:12px">' + marker.getExtData().address + '</div>'
            )
            normalMarker.setPosition(position)
            map.add(normalMarker)
          }
        }
      })
      marker.on('mouseout', () => map.remove(normalMarker))
    }
  })
}

function bindEvents() {
  const messagesEl = document.getElementById('messages')!
  const inputEl = document.getElementById('input') as HTMLTextAreaElement
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement
  const attachBtn = document.getElementById('attach-btn') as HTMLButtonElement
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const fileIndicator = document.getElementById('file-indicator') as HTMLDivElement

  document.getElementById('icon-wrap')?.addEventListener('click', (e) => {
    e.stopPropagation()
    document.getElementById('version-tooltip')?.classList.toggle('visible')
  })
  document.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('#icon-wrap')) {
      document.getElementById('version-tooltip')?.classList.remove('visible')
    }
  })

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
    addMessageToUI(messagesEl, 'assistant', '鱼儿都跑了，联系一下主人吧')
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
