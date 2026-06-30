import Anthropic from '@anthropic-ai/sdk'
import { LIKE_MINDS_SYSTEM_PROMPT } from '@/lib/prompts'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const DAVID_CHAT_ID = process.env.TELEGRAM_DAVID_CHAT_ID ?? ''
const SECRET = process.env.N8N_WEBHOOK_SECRET ?? ''

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`

async function sendMessage(chatId: string, text: string) {
  const MAX = 4000
  const chunks: string[] = []
  let remaining = text.trim()
  while (remaining.length > MAX) {
    let cut = remaining.lastIndexOf('\n', MAX)
    if (cut < MAX * 0.6) cut = remaining.lastIndexOf(' ', MAX)
    if (cut < 0) cut = MAX
    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) chunks.push(remaining)

  for (const chunk of chunks) {
    await fetch(`${TG}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    })
  }
}

async function fetchMemories(): Promise<string> {
  if (!supabase) return ''
  try {
    const { data } = await supabase
      .from('memories')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!data?.length) return ''
    return `## RECENT MEMORY\n${data.map((m) => `• ${m.content}`).join('\n')}\n\n---\n\n`
  } catch {
    return ''
  }
}

const BRIEF_PROMPT = `Based on everything you know about David's business, generate a sharp morning brief for him. Keep it under 300 words. Structure it as:

1. Top 3 priorities for today — specific and actionable, not generic
2. One thing to watch or be aware of this week
3. One quick commercial opportunity worth acting on

Be direct. No fluff. Write it like a message from a sharp advisor who has been thinking overnight.`

export async function POST(req: Request) {
  try {
    if (!BOT_TOKEN) return new Response('Bot not configured', { status: 500 })

    // Auth check
    if (SECRET) {
      const auth = req.headers.get('authorization') ?? ''
      if (auth !== `Bearer ${SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    // Allow chat_id override in body, fallback to env var
    let chatId = DAVID_CHAT_ID
    try {
      const body = await req.json()
      if (body?.chat_id) chatId = String(body.chat_id)
    } catch { /* no body */ }

    if (!chatId) {
      return new Response('No chat_id configured', { status: 400 })
    }

    const memoriesSection = await fetchMemories()

    const today = new Date().toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Australia/Sydney',
    })

    const systemPrompt = `${memoriesSection}Today is ${today} (Sydney time).\n\n${LIKE_MINDS_SYSTEM_PROMPT}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: BRIEF_PROMPT }],
    })

    const brief = response.content.find((b) => b.type === 'text')?.text ?? ''

    const day = new Date().toLocaleDateString('en-AU', {
      weekday: 'long', timeZone: 'Australia/Sydney',
    })

    await sendMessage(chatId, `Good morning David. Here's your ${day} brief.\n\n${brief}`)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[telegram/brief]', err)
    return new Response('Error', { status: 500 })
  }
}
