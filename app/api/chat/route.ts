import Anthropic from '@anthropic-ai/sdk'
import { LIKE_MINDS_SYSTEM_PROMPT } from '@/lib/prompts'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SEARCH_PLACES_TOOL: Anthropic.Tool = {
  name: 'search_places',
  description:
    'Search for businesses, venues, or locations in Sydney using Google Places. Use when David asks to find restaurants, venues, competitors, suppliers, or any physical location in or around Sydney.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query e.g. "Italian restaurants Surry Hills" or "event venues Sydney CBD"',
      },
      type: {
        type: 'string',
        description: 'Optional Google Places type filter e.g. "restaurant", "bar", "lodging"',
      },
    },
    required: ['query'],
  },
}

async function searchPlaces(query: string, type?: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { error: 'Search not configured' }
  const searchQuery = `Find ${type ? type + ' ' : ''}${query} in Sydney, Australia. List top 5 results with name, address, and any useful details like rating or hours.`
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: searchQuery }] }],
          tools: [{ google_search: {} }],
        }),
      }
    )
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No results found'
    return { results: text }
  } catch {
    return { error: 'Search failed' }
  }
}

async function fetchMemories(): Promise<string> {
  if (!supabase) return ''
  try {
    const { data: conv } = await supabase
      .from('memories')
      .select('content, pinned, created_at')
      .not('content', 'like', '[DRIVE:%')
      .order('pinned', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)

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

    const memoriesSection = await fetchMemories()

    const contextSection = davidContext?.trim()
      ? `## DAVID'S CURRENT CONTEXT\n\nDavid has shared the following for this session — prioritise this over remembered context:\n\n${davidContext.trim()}\n\n---\n\n`
      : ''

    const systemPrompt = `${memoriesSection}${contextSection}Today's date is ${today} (Sydney time).\n\n${LIKE_MINDS_SYSTEM_PROMPT}`

    const tools: Anthropic.Tool[] = process.env.GEMINI_API_KEY ? [SEARCH_PLACES_TOOL] : []

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let loopMessages: Anthropic.MessageParam[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))

          while (true) {
            const stream = anthropic.messages.stream({
              model: 'claude-sonnet-4-6',
              max_tokens: 4096,
              system: systemPrompt,
              messages: loopMessages,
              ...(tools.length > 0 && { tools }),
            })

            let activeToolId = ''
            let activeToolName = ''
            let activeToolInputJson = ''
            const pendingToolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = []

            for await (const event of stream) {
              if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
                activeToolId = event.content_block.id
                activeToolName = event.content_block.name
                activeToolInputJson = ''
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  controller.enqueue(encoder.encode(event.delta.text))
                } else if (event.delta.type === 'input_json_delta') {
                  activeToolInputJson += event.delta.partial_json
                }
              } else if (event.type === 'content_block_stop' && activeToolId) {
                try {
                  pendingToolCalls.push({
                    id: activeToolId,
                    name: activeToolName,
                    input: JSON.parse(activeToolInputJson || '{}'),
                  })
                } catch { /* ignore malformed JSON */ }
                activeToolId = ''
              }
            }

            const finalMessage = await stream.finalMessage()

            if (finalMessage.stop_reason !== 'tool_use' || pendingToolCalls.length === 0) break

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              pendingToolCalls.map(async (call) => {
                let content: string
                if (call.name === 'search_places') {
                  const result = await searchPlaces(
                    call.input.query as string,
                    call.input.type as string | undefined,
                  )
                  content = JSON.stringify(result)
                } else {
                  content = 'Unknown tool'
                }
                return { type: 'tool_result' as const, tool_use_id: call.id, content }
              })
            )

            loopMessages = [
              ...loopMessages,
              { role: 'assistant' as const, content: finalMessage.content },
              { role: 'user' as const, content: toolResults },
            ]
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
