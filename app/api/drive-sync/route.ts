import { supabase } from '@/lib/supabase'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Each chunk is ~1800 chars with 100-char overlap so context doesn't break at boundaries
const CHUNK_SIZE = 1800
const CHUNK_OVERLAP = 100
const MAX_CHUNKS_PER_FILE = 6

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length && chunks.length < MAX_CHUNKS_PER_FILE) {
    chunks.push(text.slice(start, start + CHUNK_SIZE))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

const FILE_ID_RE = /^[a-zA-Z0-9_-]+$/

export async function POST(req: Request) {
  // Fail-closed: require N8N_WEBHOOK_SECRET to be configured
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

  const { fileId, fileName, content } = (await req.json()) as {
    fileId?: string
    fileName?: string
    content?: string
  }

  if (!fileId?.trim() || !content?.trim()) {
    return new Response(JSON.stringify({ error: 'fileId and content are required' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  if (!FILE_ID_RE.test(fileId.trim())) {
    return new Response(JSON.stringify({ error: 'Invalid fileId' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  if (content.length > 50000) {
    return new Response(JSON.stringify({ error: 'Content too large' }), {
      status: 413,
      headers: JSON_HEADERS,
    })
  }

  const name = fileName?.trim() ?? fileId
  const prefix = `[DRIVE:${fileId}]`

  // Delete all existing memories for this file before re-inserting
  const { data: existing } = await supabase
    .from('memories')
    .select('id')
    .like('content', `${prefix}%`)

  if (existing && existing.length > 0) {
    await supabase
      .from('memories')
      .delete()
      .in('id', existing.map((m) => m.id))
  }

  const chunks = chunkText(content.trim())
  const total = chunks.length

  const rows = chunks.map((chunk, i) => ({
    content:
      total > 1
        ? `${prefix} ${name} (${i + 1}/${total})\n\n${chunk}`
        : `${prefix} ${name}\n\n${chunk}`,
    pinned: false,
  }))

  const { error } = await supabase.from('memories').insert(rows)

  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  return new Response(JSON.stringify({ ok: true, fileName: name, chunks: total }), {
    headers: JSON_HEADERS,
  })
}
