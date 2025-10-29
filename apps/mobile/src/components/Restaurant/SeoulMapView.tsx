import React, { useState } from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native'
import { SEOUL_DISTRICTS, District } from './SeoulMapDistricts'
import { useTheme, THEME_COLORS } from 'shared'
import SeoulMapSvg from '../../assets/images/name_mark_map-seoul.svg'

interface SeoulMapViewProps {
  onDistrictClick: (districtName: string) => void
}

const SeoulMapView: React.FC<SeoulMapViewProps> = ({ onDistrictClick }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const [pressedDistrict, setPressedDistrict] = useState<string | null>(null)

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setMapSize({ width, height })
  }

  const handleDistrictPress = (districtName: string) => {
    setPressedDistrict(districtName)
    setTimeout(() => {
      setPressedDistrict(null)
      onDistrictClick(districtName)
    }, 200)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SVG 지도 */}
      <View style={styles.mapContainer} onLayout={handleLayout}>
        <SeoulMapSvg
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        />
      </View>

      {/* 터치 가능한 구 영역들 */}
      {mapSize.width > 0 && mapSize.height > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {SEOUL_DISTRICTS.map((district: District) => {
            const isPressed = pressedDistrict === district.name

            return (
              <TouchableOpacity
                key={district.name}
                style={[
                  styles.districtArea,
                  {
                    left: district.x * mapSize.width,
                    top: district.y * mapSize.height,
                    width: district.width * mapSize.width,
                    height: district.height * mapSize.height,
                    backgroundColor: isPressed
                      ? theme === 'dark'
                        ? 'rgba(100,150,255,0.4)'
                        : 'rgba(0,100,255,0.4)'
                      : 'transparent',
                  },
                ]}
                onPress={() => handleDistrictPress(district.name)}
                activeOpacity={0.7}
              >
                {/* 디버그용 라벨 (프로덕션에서는 제거) */}
                {__DEV__ && (
                  <Text style={styles.districtLabel}>{district.name}</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  districtArea: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: __DEV__ ? 1 : 0,
    borderColor: __DEV__ ? 'rgba(255,0,0,0.3)' : 'transparent',
  },
  districtLabel: {
    fontSize: 10,
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
  },
})

export default SeoulMapView
