export interface KakaoAddressResult {
  addressName: string
  placeName?: string
  x: string  // 경도
  y: string  // 위도
}

export async function searchAddress(query: string): Promise<KakaoAddressResult[]> {
  const res = await fetch(`/api/kakao/address?query=${encodeURIComponent(query)}`)

  if (!res.ok) {
    throw new Error(`주소 검색 실패: ${res.status}`)
  }

  const data: Array<Record<string, string>> = await res.json()

  return data.map((doc) => ({
    addressName: doc.address_name,
    placeName: doc.place_name || undefined,
    x: doc.x,
    y: doc.y,
  }))
}
