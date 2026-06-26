import Anthropic from '@anthropic-ai/sdk'
import { fetchPageContent } from '@/lib/fetcher'
import { getSystemPrompt, buildUserPrompt, ToolType } from '@/lib/prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const TOOLS_REQUIRING_URL: ToolType[] = ['audit', 'copy', 'competitors']

export async function POST(req: Request) {
  try {
    const { tool, input } = (await req.json()) as { tool: ToolType; input: string }

    if (!tool || !input) {
      return new Response(JSON.stringify({ error: 'Missing tool or input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let pageContent: string | undefined
    let fetchError: string | undefined

    if (TOOLS_REQUIRING_URL.includes(tool)) {
      const url = input.startsWith('http') ? input : `https://${input}`
      const result = await fetchPageContent(url)
      if (result.error) {
        fetchError = result.error
      } else {
        pageContent = result.content
      }
    } else if (tool === 'emails' && (input.startsWith('http') || input.startsWith('www.'))) {
      const url = input.startsWith('http') ? input : `https://${input}`
      const result = await fetchPageContent(url)
      if (!result.error) {
        pageContent = result.content
      }
    }

    const systemPrompt = getSystemPrompt(tool)
    const userPrompt = buildUserPrompt(tool, input, pageContent)

    const finalPrompt = fetchError
      ? `${userPrompt}\n\nNote: The website could not be fetched (${fetchError}). Please analyze what you can based on the URL/domain name and provide the most helpful analysis possible, noting assumptions made.`
      : userPrompt

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: finalPrompt }],
      stream: true,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
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
