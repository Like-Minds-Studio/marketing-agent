import { supabase } from '@/lib/supabase'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function GET() {
  if (!supabase) {
    return new Response(JSON.stringify([]), { headers: JSON_HEADERS })
  }

  // Try ordering by pinned first — falls back if column doesn't exist yet
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('pinned', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    // pinned column may not exist — fall back to created_at only
    const { data: fallback } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    return new Response(JSON.stringify(fallback ?? []), { headers: JSON_HEADERS })
  }

  return new Response(JSON.stringify(data ?? []), { headers: JSON_HEADERS })
}

export async function POST(req: Request) {
  // Fail-closed: n8n-only endpoint, always require secret
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    })
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 503,
      headers: JSON_HEADERS,
    })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: 'Content required' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({ content: content.trim() })
    .select('id')
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), { headers: JSON_HEADERS })
}

export async function PATCH(req: Request) {
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 503,
      headers: JSON_HEADERS,
    })
  }

  const body = await req.json()
  const { id, pinned } = body

  if (typeof id !== 'string' || !id.trim()) {
    return new Response(JSON.stringify({ error: 'Invalid id' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }
  if (typeof pinned !== 'boolean') {
    return new Response(JSON.stringify({ error: 'pinned must be boolean' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const { error } = await supabase.from('memories').update({ pinned }).eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
}

export async function DELETE(req: Request) {
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 503,
      headers: JSON_HEADERS,
    })
  }

  const { id } = await req.json()
  if (typeof id !== 'string' || !id.trim()) {
    return new Response(JSON.stringify({ error: 'Invalid id' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const { error } = await supabase.from('memories').delete().eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
}
