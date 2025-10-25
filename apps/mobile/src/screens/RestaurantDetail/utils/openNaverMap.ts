import { Linking } from 'react-native'

/**
 * Open Naver Map with app-first strategy
 * Tries to open Naver Map app first, falls back to mobile web
 */
export const openNaverMap = async (placeId: string) => {
  const appScheme = `nmap://place?id=${placeId}`
  const webFallback = `https://m.place.naver.com/restaurant/${placeId}/location`

  try {
    const canOpen = await Linking.canOpenURL(appScheme)

    if (canOpen) {
      // Naver Map app installed → open in app
      await Linking.openURL(appScheme)
    } else {
      // App not installed → open mobile web
      await Linking.openURL(webFallback)
    }
  } catch (error) {
    console.error('❌ Failed to open Naver Map:', error)
    // Error fallback → open web
    Linking.openURL(webFallback)
  }
}
