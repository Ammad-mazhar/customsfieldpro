// ── AI Receptionist Engine ───────────────────────────────────────────────────
// Core utility: conversation storage, system prompt, Claude API, action parsing

const CONV_KEY_PREFIX = 'customsfieldpro_ai_conv_'
const ALL_CONVS_KEY   = 'customsfieldpro_ai_conversations'
const SETTINGS_KEY    = 'customsfieldpro_ai_receptionist_settings'

// ── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  active:                   false,
  receptionistName:         'Alex',
  tone:                     'Friendly',
  language:                 'English',
  greeting:                 "Hi! You've reached {{company_name}}. I'm {{receptionist_name}}, your virtual assistant. How can I help you today?",
  businessName:             'CustomsFieldPro Services',
  services:                 ['HVAC', 'Plumbing', 'Electrical', 'Appliance Repair'],
  serviceArea:              'Fairfax County, Prince William County, and surrounding areas in Northern Virginia',
  businessHours: {
    Mon: { open: true,  start: '08:00', end: '18:00' },
    Tue: { open: true,  start: '08:00', end: '18:00' },
    Wed: { open: true,  start: '08:00', end: '18:00' },
    Thu: { open: true,  start: '08:00', end: '18:00' },
    Fri: { open: true,  start: '08:00', end: '18:00' },
    Sat: { open: false, start: '09:00', end: '14:00' },
    Sun: { open: false, start: '09:00', end: '14:00' },
  },
  afterHoursMessage:        "Our office is currently closed. Our regular hours are Monday–Friday 8am–6pm. I can schedule something for the next available business day!",
  emergencyService:         true,
  emergencySurcharge:       150,
  pricingInfo:              'Starting from $89 for a diagnostic visit',
  specialInstructions:      'Always mention we offer free estimates for new installations',
  canBookDirectly:          true,
  requireDepositConfirmation: false,
  confirmationMessage:      "Your appointment is confirmed! A technician will arrive at the scheduled time. You'll receive a reminder before the visit.",
  advanceHours:             4,
  escalationKeywords: {
    emergency:    ['flooding', 'flood', 'gas smell', 'gas leak', 'sparks', 'no heat', 'fire', 'burning smell', 'smoke', 'burst pipe', 'sewage'],
    anger:        ['angry', 'lawsuit', 'terrible', 'cancel', 'fraud', 'scam', 'horrible', 'worst', 'ridiculous', 'unacceptable'],
    humanRequest: ['speak to someone', 'real person', 'manager', 'human', 'agent', 'representative', 'talk to someone'],
  },
  maxAiFailures:            3,
  escalationSmsAdmin:       true,
  escalationInApp:          true,
  escalationMessage:        "I'm connecting you with our team now. Someone will reach out shortly!",
  connectedPhone:           '(703) 555-0190',
  twilioAccountSid:         '',
  twilioAuthToken:          '',
  twilioPhone:              '',
  anthropicApiKey:          '',
}

// ── Settings store ───────────────────────────────────────────────────────────

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      businessHours: { ...DEFAULT_SETTINGS.businessHours, ...(parsed.businessHours || {}) },
      escalationKeywords: { ...DEFAULT_SETTINGS.escalationKeywords, ...(parsed.escalationKeywords || {}) },
    }
  } catch { return { ...DEFAULT_SETTINGS } }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// ── Per-phone conversation history ───────────────────────────────────────────

export function loadConversation(phone) {
  try {
    const key = CONV_KEY_PREFIX + phone.replace(/\W/g, '')
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const data = JSON.parse(raw)
    // Auto-clear after 24 hours of inactivity
    if (data.length > 0) {
      const lastTs = new Date(data[data.length - 1].timestamp).getTime()
      if (Date.now() - lastTs > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key)
        return []
      }
    }
    return data.slice(-20)
  } catch { return [] }
}

export function saveConversation(phone, messages) {
  const key = CONV_KEY_PREFIX + phone.replace(/\W/g, '')
  localStorage.setItem(key, JSON.stringify(messages.slice(-20)))
}

export function clearConversation(phone) {
  const key = CONV_KEY_PREFIX + phone.replace(/\W/g, '')
  localStorage.removeItem(key)
}

// ── All conversations index ───────────────────────────────────────────────────

export function loadAllConversations() {
  try {
    const raw = localStorage.getItem(ALL_CONVS_KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (saved && saved.length > 0) return saved
    // Return seed data if empty
    return getSeedConversations()
  } catch { return getSeedConversations() }
}

export function saveAllConversations(convs) {
  localStorage.setItem(ALL_CONVS_KEY, JSON.stringify(convs.slice(0, 200)))
}

export function upsertConversationRecord(phone, channel, update) {
  const all = loadAllConversations()
  const idx = all.findIndex(c => c.phone === phone)
  const now = new Date().toISOString()
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...update, lastActivity: now }
  } else {
    all.unshift({
      id: `AICONV-${Date.now()}`,
      phone,
      channel: channel || 'SMS',
      startedAt: now,
      lastActivity: now,
      messageCount: 1,
      outcome: 'Ongoing',
      requestId: null,
      escalated: false,
      escalationReason: null,
      ...update,
    })
  }
  saveAllConversations(all)
  return all
}

function getSeedConversations() {
  const now = Date.now()
  return [
    {
      id: 'AICONV-SEED-1', phone: '(703) 555-8832', channel: 'SMS',
      startedAt: new Date(now - 2 * 3600000).toISOString(),
      lastActivity: new Date(now - 90 * 60000).toISOString(),
      messageCount: 7, outcome: 'Request Created', requestId: 'REQ-AI-SEED-1',
      escalated: false, escalationReason: null,
    },
    {
      id: 'AICONV-SEED-2', phone: '(703) 555-2241', channel: 'SMS',
      startedAt: new Date(now - 45 * 60000).toISOString(),
      lastActivity: new Date(now - 20 * 60000).toISOString(),
      messageCount: 3, outcome: 'Escalated to Human', requestId: null,
      escalated: true, escalationReason: 'Emergency keyword: gas smell',
    },
    {
      id: 'AICONV-SEED-3', phone: '(571) 555-9901', channel: 'SMS',
      startedAt: new Date(now - 15 * 60000).toISOString(),
      lastActivity: new Date(now - 8 * 60000).toISOString(),
      messageCount: 5, outcome: 'Answered Only', requestId: null,
      escalated: false, escalationReason: null,
    },
    {
      id: 'AICONV-SEED-4', phone: '(703) 555-4477', channel: 'SMS',
      startedAt: new Date(now - 5 * 60000).toISOString(),
      lastActivity: new Date(now - 2 * 60000).toISOString(),
      messageCount: 2, outcome: 'Ongoing', requestId: null,
      escalated: false, escalationReason: null,
    },
    {
      id: 'AICONV-SEED-5', phone: '(571) 555-3319', channel: 'SMS',
      startedAt: new Date(now - 5 * 3600000).toISOString(),
      lastActivity: new Date(now - 4 * 3600000).toISOString(),
      messageCount: 9, outcome: 'Request Created', requestId: 'REQ-AI-SEED-2',
      escalated: false, escalationReason: null,
    },
  ]
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getAIStats() {
  const all = loadAllConversations()
  const today = new Date().toDateString()
  const todayConvs = all.filter(c => new Date(c.startedAt).toDateString() === today)
  const total = all.length

  return {
    todayTexts:       todayConvs.filter(c => c.channel === 'SMS').length,
    todayCalls:       todayConvs.filter(c => c.channel === 'Call').length,
    todayRequests:    todayConvs.filter(c => c.requestId).length,
    todayEscalations: todayConvs.filter(c => c.escalated).length,
    resolutionRate:   todayConvs.length > 0
      ? Math.round((todayConvs.filter(c => !c.escalated).length / todayConvs.length) * 100)
      : total > 0 ? Math.round((all.filter(c => !c.escalated).length / total) * 100) : 0,
    totalToday:       todayConvs.length,
    recent:           all.slice(0, 10),
  }
}

// ── Escalation keyword checker ───────────────────────────────────────────────

export function checkEscalation(message, settings) {
  const lower = message.toLowerCase()
  const { emergency = [], anger = [], humanRequest = [] } = settings.escalationKeywords || {}

  if (emergency.some(kw => lower.includes(kw.toLowerCase()))) {
    return { escalate: true, reason: `Emergency keyword detected: "${message.slice(0, 50)}"`, category: 'emergency' }
  }
  if (humanRequest.some(kw => lower.includes(kw.toLowerCase()))) {
    return { escalate: true, reason: 'Customer requested human agent', category: 'human_request' }
  }
  if (anger.some(kw => lower.includes(kw.toLowerCase()))) {
    return { escalate: true, reason: 'Customer appears upset or angry', category: 'anger' }
  }
  return { escalate: false }
}

// ── Business hours check ─────────────────────────────────────────────────────

export function isBusinessHours(settings) {
  const now = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[now.getDay()]
  const hours = settings.businessHours?.[dayName]
  if (!hours?.open) return false
  const [startH, startM] = hours.start.split(':').map(Number)
  const [endH, endM]     = hours.end.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= startH * 60 + startM && cur <= endH * 60 + endM
}

// ── System prompt builder ────────────────────────────────────────────────────

export function buildSystemPrompt(settings, afterHours = false) {
  const name    = settings.receptionistName || 'Alex'
  const company = settings.businessName || 'CustomsFieldPro Services'
  const tone    = settings.tone || 'Friendly'
  const services = (settings.services || []).join(', ')

  const toneMap = {
    Professional: 'Be formal, precise, and businesslike. Use complete sentences.',
    Friendly:     'Be warm, approachable, and encouraging. Use a conversational tone.',
    Casual:       'Be relaxed and informal. Keep responses brief and easy-going.',
  }

  const hoursBlock = Object.entries(settings.businessHours || {})
    .map(([d, h]) => h.open ? `${d}: ${h.start}–${h.end}` : `${d}: Closed`)
    .join(' | ')

  return `You are ${name}, a virtual receptionist for ${company}, a home & commercial field service company.

SERVICES: ${services}
SERVICE AREA: ${settings.serviceArea || 'Local area'}
BUSINESS HOURS: ${hoursBlock}
${settings.pricingInfo ? `PRICING INFO: ${settings.pricingInfo}` : ''}
EMERGENCY SERVICE: ${settings.emergencyService ? `Available — $${settings.emergencySurcharge || 0} surcharge` : 'Not available'}
${settings.specialInstructions ? `SPECIAL INSTRUCTIONS: ${settings.specialInstructions}` : ''}

TONE: ${toneMap[tone] || toneMap.Friendly}
${settings.language === 'Spanish' ? 'LANGUAGE: Respond in Spanish only.' : settings.language === 'Both' ? 'LANGUAGE: Detect the customer language and respond in that same language.' : ''}
${afterHours ? `AFTER HOURS NOTICE: Business is currently closed. Say: "${settings.afterHoursMessage}"` : ''}

YOUR GOAL: Collect the following to create a service request:
1. Customer's full name
2. Service address (including city)
3. Problem description in detail
4. Equipment brand/model (if applicable)
5. Preferred appointment time

When you have collected at minimum name, address, and problem description, output this on its own line (fill all fields, use empty string if unknown):
ACTION:{"type":"create_request","name":"FULL_NAME","address":"FULL_ADDRESS","problem":"PROBLEM_DESC","equipment":"EQUIPMENT_INFO","preferredTime":"PREFERRED_TIME","phone":""}

STRICT RULES:
- Keep SMS replies UNDER 160 characters when possible — be concise
- NEVER invent pricing — say "our technician will provide a quote on-site"
- Ask at most 2 questions per reply
- If after 3 attempts you cannot understand the customer, output: ESCALATE:{"reason":"Unable to understand request after 3 attempts"}
- Never mention competitor names
- When booking: "We have availability at [time]. Shall I confirm that?"
- Always be helpful, never rude, never make promises you cannot keep`
}

// ── ACTION tag parser ────────────────────────────────────────────────────────

export function parseActionFromResponse(text) {
  const actionMatch    = text.match(/ACTION:\{[\s\S]*?\}/m)
  const escalateMatch  = text.match(/ESCALATE:\{[\s\S]*?\}/m)

  if (actionMatch) {
    try {
      return { type: 'create_request', data: JSON.parse(actionMatch[0].replace('ACTION:', '')) }
    } catch { return null }
  }
  if (escalateMatch) {
    try {
      return { type: 'escalate', data: JSON.parse(escalateMatch[0].replace('ESCALATE:', '')) }
    } catch { return { type: 'escalate', data: { reason: 'AI could not resolve conversation' } } }
  }
  return null
}

export function cleanResponseText(text) {
  return text
    .replace(/ACTION:\{[\s\S]*?\}/gm, '')
    .replace(/ESCALATE:\{[\s\S]*?\}/gm, '')
    .trim()
}

// ── Create service request from AI data ─────────────────────────────────────

export function createAIServiceRequest(data, phone) {
  try {
    const raw = localStorage.getItem('ff_requests')
    const requests = raw ? JSON.parse(raw) : []
    const id = `REQ-AI-${Date.now()}`
    const newReq = {
      id,
      clientId:      null,
      clientName:    data.name  || 'Unknown (AI)',
      clientPhone:   phone,
      type:          guessServiceType(data.problem || ''),
      description:   data.problem || '',
      address:       data.address || '',
      equipment:     data.equipment || '',
      preferredDate: data.preferredTime || '',
      preferredTime: data.preferredTime || '',
      received:      new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }),
      priority:      'Normal',
      status:        'Open',
      internalNotes: '🤖 Created by AI Receptionist',
      aiCreated:     true,
      aiPhone:       phone,
    }
    requests.unshift(newReq)
    localStorage.setItem('ff_requests', JSON.stringify(requests))

    // Admin notification
    try {
      const nRaw  = localStorage.getItem('customsfieldpro_notifications')
      const notifs = nRaw ? JSON.parse(nRaw) : []
      notifs.unshift({
        id:              `NOTIF-AI-${Date.now()}`,
        type:            'AI_REQUEST_CREATED',
        title:           '🤖 AI Created Service Request',
        description:     `AI booked a request from ${data.name || phone}: ${(data.problem || '').slice(0, 60)}`,
        targetUserId:    'admin',
        relatedModule:   'Requests',
        relatedRecordId: id,
        read:            false,
        createdAt:       new Date().toISOString(),
        urgent:          false,
      })
      localStorage.setItem('customsfieldpro_notifications', JSON.stringify(notifs))
    } catch {}

    return newReq
  } catch (err) {
    console.error('[AI] Failed to create request:', err)
    return null
  }
}

function guessServiceType(problem) {
  const l = problem.toLowerCase()
  if (l.includes('ac') || l.includes('hvac') || l.includes('heat') || l.includes('furnace') || l.includes('cool') || l.includes('air condition')) return 'HVAC Repair'
  if (l.includes('plumb') || l.includes('pipe') || l.includes('leak') || l.includes('drain') || l.includes('water heater') || l.includes('toilet')) return 'Plumbing'
  if (l.includes('electric') || l.includes('outlet') || l.includes('panel') || l.includes('breaker') || l.includes('wiring') || l.includes('light')) return 'Electrical'
  if (l.includes('appliance') || l.includes('washer') || l.includes('dryer') || l.includes('fridge') || l.includes('dishwasher') || l.includes('oven')) return 'Appliance Repair'
  return 'HVAC Repair'
}

// ── Create escalation notification ──────────────────────────────────────────

function createEscalationNotif(phone, reason, message) {
  try {
    const nRaw   = localStorage.getItem('customsfieldpro_notifications')
    const notifs = nRaw ? JSON.parse(nRaw) : []
    notifs.unshift({
      id:              `NOTIF-ESC-${Date.now()}`,
      type:            'AI_ESCALATION',
      title:           '⚠️ AI Escalation Required',
      description:     `${phone}: ${reason}. Customer: "${message.slice(0, 80)}"`,
      targetUserId:    'admin',
      relatedModule:   'AIReceptionist',
      relatedRecordId: phone,
      read:            false,
      createdAt:       new Date().toISOString(),
      urgent:          true,
    })
    localStorage.setItem('customsfieldpro_notifications', JSON.stringify(notifs))
  } catch {}
}

// ── Demo mode response generator ─────────────────────────────────────────────

function generateDemoResponse(message, history, settings) {
  const lower    = history.length
  const name     = settings.receptionistName || 'Alex'
  const company  = settings.businessName || 'CustomsFieldPro'
  const msg      = message.toLowerCase()

  if (lower === 0) {
    return { text: `Hi! I'm ${name} from ${company}. How can I help you today?` }
  }
  if (lower === 1) {
    if (msg.includes('ac') || msg.includes('heat') || msg.includes('cool') || msg.includes('furnace')) {
      return { text: `Sorry to hear that! Can I get your name and service address to get started?` }
    }
    if (msg.includes('plumb') || msg.includes('leak') || msg.includes('pipe') || msg.includes('drain')) {
      return { text: `I can help with that! What's your name and the property address?` }
    }
    if (msg.includes('electric') || msg.includes('outlet') || msg.includes('breaker')) {
      return { text: `Our electricians can handle that. What's your name and address?` }
    }
    return { text: `I'd be happy to help! What service do you need, and what's your name and address?` }
  }
  if (lower === 2) {
    return { text: `Thanks! Can you describe what's happening in more detail and your preferred time for a visit?` }
  }
  if (lower === 3) {
    return { text: `Got it. Do you know the brand or model of the equipment? And would tomorrow morning or afternoon work?` }
  }
  if (lower >= 4) {
    const allUser = history.filter(m => m.role === 'user').concat([{ content: message }])
    const combined = allUser.map(m => m.content).join(' ')
    const nameMatch    = combined.match(/(?:I'm|I am|name is|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
    const addrMatch    = combined.match(/\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:St|Ave|Dr|Rd|Ln|Blvd|Ct|Way|Pl|Street|Avenue|Drive|Road|Lane)/i)
    const extractedName = nameMatch?.[1] || 'Customer'
    const extractedAddr = addrMatch?.[0] || 'Address provided by customer'
    return {
      text: `Perfect! I've booked your request. A technician will reach out to confirm. Is there anything else?`,
      action: {
        type: 'create_request',
        data: {
          name:          extractedName,
          address:       extractedAddr,
          problem:       allUser[0]?.content || message,
          equipment:     '',
          preferredTime: 'As soon as possible',
        },
      },
    }
  }
  return { text: `Got it! What's the best time for a technician to come by?` }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleIncomingMessage(message, fromPhone, channel = 'SMS', onLog = null) {
  const log = (text) => { if (onLog) onLog(text) }
  const settings = loadSettings()

  if (!settings.active && fromPhone !== '(703) 555-TEST') {
    return { reply: null, error: 'AI Receptionist is paused' }
  }

  log('Received message')
  await delay(120)

  // Load conversation history
  const history = loadConversation(fromPhone)

  // Check escalation keywords
  log('Checking for escalation keywords…')
  await delay(180)
  const escalation = checkEscalation(message, settings)

  if (escalation.escalate) {
    const escalationMsg = settings.escalationMessage || "I'm connecting you with our team now!"
    log(`⚠️ Escalation triggered: ${escalation.reason}`)
    const updatedHistory = [
      ...history,
      { role: 'user',      content: message,       timestamp: new Date().toISOString() },
      { role: 'assistant', content: escalationMsg, timestamp: new Date().toISOString(), escalated: true },
    ]
    saveConversation(fromPhone, updatedHistory)
    upsertConversationRecord(fromPhone, channel, {
      outcome: 'Escalated to Human', escalated: true,
      escalationReason: escalation.reason, messageCount: updatedHistory.length,
    })
    createEscalationNotif(fromPhone, escalation.reason, message)
    log('Admin notification sent')
    return {
      reply: escalationMsg, escalated: true,
      escalationReason: escalation.reason, escalationCategory: escalation.category,
    }
  }

  const afterHours = !isBusinessHours(settings)
  const apiKey     = settings.anthropicApiKey

  if (!apiKey) {
    // Demo mode
    log('No API key — using demo mode…')
    await delay(400)
    const demo = generateDemoResponse(message, history, settings)
    log('Generating response…')
    await delay(300)

    const updatedHistory = [
      ...history,
      { role: 'user',      content: message,    timestamp: new Date().toISOString() },
      { role: 'assistant', content: demo.text,  timestamp: new Date().toISOString() },
    ]
    saveConversation(fromPhone, updatedHistory)

    if (demo.action?.type === 'create_request') {
      log('Creating service request…')
      await delay(250)
      const req = createAIServiceRequest({ ...demo.action.data, phone: fromPhone }, fromPhone)
      upsertConversationRecord(fromPhone, channel, {
        messageCount: updatedHistory.length, outcome: 'Request Created', requestId: req?.id,
      })
      log(`✅ Request created: ${req?.id}`)
      return { reply: demo.text, action: { type: 'create_request', request: req }, demoMode: true }
    }

    upsertConversationRecord(fromPhone, channel, { messageCount: updatedHistory.length })
    log('Reply sent')
    return { reply: demo.text, action: null, demoMode: true }
  }

  // Real Claude API call
  log('Building system prompt…')
  await delay(100)
  const systemPrompt = buildSystemPrompt(settings, afterHours)
  const claudeMessages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  log('Calling Claude API…')
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:     systemPrompt,
        messages:   claudeMessages,
      }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data     = await response.json()
    const rawReply = data.content?.[0]?.text || ''
    log('Parsing AI response…')
    await delay(100)

    const action     = parseActionFromResponse(rawReply)
    const cleanReply = cleanResponseText(rawReply)

    const updatedHistory = [
      ...history,
      { role: 'user',      content: message,     timestamp: new Date().toISOString() },
      { role: 'assistant', content: cleanReply,  timestamp: new Date().toISOString() },
    ]
    saveConversation(fromPhone, updatedHistory)

    if (action?.type === 'create_request') {
      log('Creating service request…')
      const req = createAIServiceRequest({ ...action.data, phone: fromPhone }, fromPhone)
      upsertConversationRecord(fromPhone, channel, {
        messageCount: updatedHistory.length, outcome: 'Request Created', requestId: req?.id,
      })
      log(`✅ Request created: ${req?.id}`)
      return { reply: cleanReply, action: { type: 'create_request', request: req } }
    }

    if (action?.type === 'escalate') {
      const esc = settings.escalationMessage
      upsertConversationRecord(fromPhone, channel, {
        messageCount: updatedHistory.length, outcome: 'Escalated to Human',
        escalated: true, escalationReason: action.data?.reason,
      })
      createEscalationNotif(fromPhone, action.data?.reason || 'AI escalation', message)
      log('⚠️ Escalated to human — notification sent')
      return { reply: esc, action: { type: 'escalate', reason: action.data?.reason } }
    }

    upsertConversationRecord(fromPhone, channel, { messageCount: updatedHistory.length })
    log('Reply sent')
    return { reply: cleanReply, action: null }

  } catch (err) {
    log(`❌ API error: ${err.message}`)
    return { reply: null, error: err.message }
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
