import Anthropic from '@anthropic-ai/sdk'
import { LIKE_MINDS_SYSTEM_PROMPT } from '@/lib/prompts'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Message {
  role: 'user' | 'assistant'
  content: string
}

async function fetchMemories(): Promise<string> {
  if (!supabase) return ''
  try {
    // Conversational memories — extracted facts from past sessions
    const { data: conv } = await supabase
      .from('memories')
      .select('content, pinned, created_at')
      .not('content', 'like', '[DRIVE:%')
      .order('pinned', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)

    // Drive file memories — synced from Google Drive
    const { data: drive } = await supabase
      .from('memories')
      .select('content')
      .like('content', '[DRIVE:%')
      .order('created_at', { ascending: false })
      .limit(15)

    let result = ''

    if (conv && conv.length > 0) {
      const bullets = conv.map((m) => `• ${m.content}`).join('\n')
      result += `## WHAT YOU REMEMBER ABOUT DAVID'S CURRENT SITUATION\nFrom previous conversations, these facts have been captured. Use them as live context — but note they may have evolved:\n\n${bullets}\n\n---\n\n`
    }

    if (drive && drive.length > 0) {
      const docs = drive.map((m) => m.content).join('\n\n---\n\n')
      result += `## DAVID'S GOOGLE DRIVE CONTEXT\nThe following content has been synced automatically from David's Google Drive. Use it when answering questions about his documents, files, or ongoing work:\n\n${docs}\n\n---\n\n`
    }

    return result
  } catch {
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const { messages, davidContext } = (await req.json()) as {
      messages: Message[]
      davidContext?: string
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const today = new Date().toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Australia/Sydney',
    })

    const [memoriesSection] = await Promise.all([fetchMemories()])

    const contextSection = davidContext?.trim()
      ? `## DAVID'S CURRENT CONTEXT\n\nDavid has shared the following for this session — prioritise this over remembered context:\n\n${davidContext.trim()}\n\n---\n\n`
      : ''

    const systemPrompt = `${memoriesSection}${contextSection}Today's date is ${today} (Sydney time).\n\n${LIKE_MINDS_SYSTEM_PROMPT}`

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
