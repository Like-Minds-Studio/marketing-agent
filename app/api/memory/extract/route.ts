import { extractAndSaveMemory } from '@/lib/extractMemory'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  if (!supabase) {
    return new Response(JSON.stringify({ ok: true, extracted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { userMessage: rawUser, assistantMessage: rawAssistant } = await req.json() as {
      userMessage: string
      assistantMessage: string
    }

    if (typeof rawUser !== 'string' || typeof rawAssistant !== 'string') {
      return new Response(JSON.stringify({ ok: true, extracted: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await extractAndSaveMemory(rawUser, rawAssistant)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: true, extracted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
