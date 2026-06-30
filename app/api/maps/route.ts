const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? ''

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function POST(req: Request) {
  if (!MAPS_KEY) {
    return new Response(JSON.stringify({ error: 'Google Maps not configured' }), {
      status: 503,
      headers: JSON_HEADERS,
    })
  }

  const { query, type } = (await req.json()) as { query: string; type?: string }

  if (!query?.trim()) {
    return new Response(JSON.stringify({ error: 'Query required' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  try {
    // Text search — finds places matching the query
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    searchUrl.searchParams.set('query', query)
    searchUrl.searchParams.set('key', MAPS_KEY)
    if (type) searchUrl.searchParams.set('type', type)
    // Bias results toward Sydney
    searchUrl.searchParams.set('location', '-33.8688,151.2093')
    searchUrl.searchParams.set('radius', '50000')

    const res = await fetch(searchUrl.toString())
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return new Response(JSON.stringify({ error: data.status, detail: data.error_message }), {
        status: 500,
        headers: JSON_HEADERS,
      })
    }

    // Return clean summary of top results
    const results = (data.results ?? []).slice(0, 5).map((place: {
      name: string
      formatted_address: string
      rating?: number
      user_ratings_total?: number
      types?: string[]
      business_status?: string
      opening_hours?: { open_now?: boolean }
      price_level?: number
    }) => ({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      reviews: place.user_ratings_total,
      types: place.types?.slice(0, 3),
      status: place.business_status,
      open_now: place.opening_hours?.open_now,
      price_level: place.price_level,
    }))

    return new Response(JSON.stringify({ ok: true, query, results }), {
      headers: JSON_HEADERS,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Maps API error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
}
