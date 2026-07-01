import Anthropic from '@anthropic-ai/sdk'
import { LIKE_MINDS_SYSTEM_PROMPT } from '@/lib/prompts'
import { supabase } from '@/lib/supabase'
import { extractAndSaveMemory } from '@/lib/extractMemory'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const ALLOWED_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`

interface TgUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number; first_name?: string }
    text?: string
  }
}

async function tgPost(method: string, body: object) {
  await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function splitMessage(text: string): string[] {
  const MAX = 4000
  if (text.length <= MAX) return [text]
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > MAX) {
    let cut = remaining.lastIndexOf('\n', MAX)
    if (cut < MAX * 0.6) cut = remaining.lastIndexOf(' ', MAX)
    if (cut < 0) cut = MAX
    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/\*([\s\S]*?)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

async function sendReply(chatId: number, text: string) {
  const clean = stripMarkdown(text)
  for (const chunk of splitMessage(clean)) {
    await tgPost('sendMessage', { chat_id: chatId, text: chunk })
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
    return `## WHAT YOU REMEMBER ABOUT DAVID'S CURRENT SITUATION\n${data.map((m) => `• ${m.content}`).join('\n')}\n\n---\n\n`
  } catch {
    return ''
  }
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

async function getHistory(chatId: number): Promise<ChatMessage[]> {
  if (!supabase) return []
  try {
    const { data } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', `telegram_${chatId}`)
      .single()
    return (data?.messages as ChatMessage[]) ?? []
  } catch {
    return []
  }
}

async function saveHistory(chatId: number, messages: ChatMessage[]) {
  if (!supabase) return
  try {
    await supabase.from('conversations').upsert({
      id: `telegram_${chatId}`,
      title: 'Telegram — David',
      messages: messages.slice(-40), // keep last 20 turns
      updated_at: new Date().toISOString(),
    })
  } catch {
    // best-effort
  }
}

export async function POST(req: Request) {
  try {
    if (!BOT_TOKEN) return new Response('Not configured', { status: 500 })

    // Verify Telegram webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const token = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
      if (token !== webhookSecret) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const update = (await req.json()) as TgUpdate
    const msg = update.message
    if (!msg?.text) return new Response('OK', { status: 200 })

    const chatId = msg.chat.id
    const text = msg.text.trim()

    // Whitelist check — if no IDs configured, allow all (testing mode)
    if (ALLOWED_IDS.length > 0 && !ALLOWED_IDS.includes(String(chatId))) {
      await sendReply(chatId, 'This advisor is private.')
      return new Response('OK', { status: 200 })
    }

    // /start command
    if (text === '/start') {
      const name = msg.chat.first_name ? ` ${msg.chat.first_name}` : ''
      await sendReply(
        chatId,
        `Hey${name} — your CEO advisor is ready.\n\nAsk me anything: a deal you're weighing, a proposal, a decision, or what to focus on this week.\n\nYour chat ID: ${chatId}`
      )
      return new Response('OK', { status: 200 })
    }

    // Show typing indicator while we work
    await tgPost('sendChatAction', { chat_id: chatId, action: 'typing' })

    const [history, memoriesSection] = await Promise.all([
      getHistory(chatId),
      fetchMemories(),
    ])

    const messages: ChatMessage[] = [...history, { role: 'user', content: text }]

    const today = new Date().toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Australia/Sydney',
    })

    const systemPrompt = `${memoriesSection}Today's date is ${today} (Sydney time).\n\n${LIKE_MINDS_SYSTEM_PROMPT}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    const reply = response.content.find((b) => b.type === 'text')?.text ?? 'No response.'

    const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: reply }]
    await saveHistory(chatId, updatedMessages)

    // Extract memory directly (no loopback HTTP — avoids Railway self-request issues)
    extractAndSaveMemory(text, reply).catch(() => {})

    await sendReply(chatId, reply)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[telegram webhook]', err)
    return new Response('OK', { status: 200 }) // Telegram needs 200 even on error
  }
}
