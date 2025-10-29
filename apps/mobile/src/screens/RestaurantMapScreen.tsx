import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { useTheme, THEME_COLORS } from 'shared'
import SeoulMapView from '../components/Restaurant/SeoulMapView'

type RestaurantStackParamList = {
  RestaurantList: { searchAddress?: string }
  RestaurantDetail: { id: string }
  RestaurantMap: undefined
}

const RestaurantMapScreen = () => {
  const navigation = useNavigation<NavigationProp<RestaurantStackParamList>>()
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const handleDistrictClick = (districtName: string) => {
    // 구 클릭 시 RestaurantList로 이동하며 검색 주소 전달
    navigation.navigate('RestaurantList', { searchAddress: districtName })
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SeoulMapView onDistrictClick={handleDistrictClick} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default RestaurantMapScreen
