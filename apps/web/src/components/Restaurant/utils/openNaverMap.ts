/**
 * 네이버 지도 열기 (앱 우선, 웹 fallback)
 */
export const openNaverMap = (placeId: string) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  if (isMobile) {
    // 모바일: 네이버맵 앱 스킴 시도
    const appScheme = `nmap://place?id=${placeId}`
    const webFallback = `https://m.place.naver.com/restaurant/${placeId}/location`

    // 앱 스킴으로 시도
    window.location.href = appScheme

    // 1.5초 후 페이지가 여전히 활성 상태면 웹으로 fallback
    setTimeout(() => {
      if (!document.hidden) {
        window.open(webFallback, '_blank')
      }
    }, 1500)
  } else {
    // 데스크톱: 바로 웹으로
    window.open(`https://map.naver.com/p/entry/place/${placeId}`, '_blank')
  }
}
