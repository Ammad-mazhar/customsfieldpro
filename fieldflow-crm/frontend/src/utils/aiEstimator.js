const STORAGE_KEY = 'customsfieldpro_ai'

export const DEFAULT_AI_CONFIG = {
  apiKey: '',
  enabled: false,
}

export function getAIConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAIConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function isAIEnabled() {
  const cfg = getAIConfig()
  return !!(cfg.enabled && cfg.apiKey && cfg.apiKey.trim())
}

/**
 * Calls Claude API to generate a job estimate.
 * Returns parsed JSON result object or throws on error.
 */
export async function getJobEstimate({ serviceType, equipment, description, propertyType, propertySize, urgency }) {
  const cfg = getAIConfig()
  if (!cfg.apiKey) throw new Error('No API key configured')

  const systemPrompt = `You are an expert HVAC, plumbing, and electrical field service estimator with 20+ years of experience.
Given a service request, provide a realistic cost estimate in JSON format.

Respond ONLY with valid JSON in this exact structure:
{
  "diagnosis": "Brief assessment of the likely issue",
  "estimatedHours": 2.5,
  "laborCost": 187.50,
  "partsNeeded": ["Part 1 - $XX", "Part 2 - $XX"],
  "totalEstimate": { "low": 250, "high": 400 },
  "urgencyNote": "Note about urgency if applicable (or empty string)",
  "lineItems": [
    { "description": "Labor - Service Call", "qty": 1, "unit": 125, "total": 125 },
    { "description": "Part Name", "qty": 1, "unit": 85, "total": 85 }
  ],
  "notes": "Any additional recommendations or warnings"
}`

  const userPrompt = `Service Type: ${serviceType || 'General Service'}
Equipment: ${equipment || 'Not specified'}
Issue Description: ${description || 'Not provided'}
Property Type: ${propertyType}
Property Size: ${propertySize}
Urgency: ${urgency}

Please provide a detailed estimate.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text

  try {
    return JSON.parse(jsonStr.trim())
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}
