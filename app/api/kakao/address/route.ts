export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 })
  }

  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json')
  url.searchParams.set('query', query)
  url.searchParams.set('size', '5')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    return Response.json({ error: `카카오 API 오류: ${res.status}` }, { status: res.status })
  }

  const data = await res.json()
  return Response.json(data.documents ?? [])
}
