import Anthropic from '@anthropic-ai/sdk'
import { LIKE_MINDS_SYSTEM_PROMPT } from '@/lib/prompts'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface Slide {
  headline: string
  body: string
  isStat: boolean
  stat?: string
  statLabel?: string
}

export interface CarouselData {
  slides: Slide[]
  caption: string
  hashtags: string
}

const VISUAL_SYSTEM = `You are a social media visual content designer for Like Minds Studio. When asked to create carousel content, respond with ONLY valid JSON — no markdown fences, no explanation text, nothing else.

${LIKE_MINDS_SYSTEM_PROMPT}`

export async function POST(req: Request) {
  try {
    const { request, format, davidContext } = await req.json() as {
      request: string
      format: string
      davidContext?: string
    }

    const contextSection = davidContext?.trim()
      ? `David's current context: ${davidContext.trim()}\n\n`
      : ''

    const prompt = `${contextSection}Create a ${format} carousel for Like Minds Studio based on this request: "${request}"

Return ONLY this JSON structure (no markdown, no explanation):
{
  "slides": [
    {
      "headline": "Short punchy headline — max 8 words",
      "body": "Supporting sentence or two — warm, specific, Like Minds voice",
      "isStat": false,
      "stat": null,
      "statLabel": null
    }
  ],
  "caption": "Ready-to-post caption for ${format}. 150-200 chars. Hook in first line. Punchy Like Minds voice.",
  "hashtags": "#hospitality #interiordesign #likemindsstudio [8-10 more relevant hashtags]"
}

Rules:
- 4-5 slides. First slide is the hook (big bold claim). Middle slides develop the idea. Last slide is always the CTA.
- CTA slide headline: "Ready to redefine your space?" Body: "Book a 30-min call. david@likemindsstudio.com"
- isStat: true when a slide features a key number (e.g. "600+" venues, "9" steps). If isStat true, populate stat and statLabel.
- stat example: "600+", statLabel example: "venues designed"
- Headlines: bold, active, no jargon. Start with a strong verb or a surprising claim.
- Body: 1-2 sentences max. Warm gray supporting detail.
- Caption: include relevant emoji sparingly. Always end with CTA to DM or email.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: VISUAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim()
    const data: CarouselData = JSON.parse(cleaned)

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
