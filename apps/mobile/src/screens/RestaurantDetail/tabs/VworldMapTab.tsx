import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme, THEME_COLORS, getDefaultApiUrl } from 'shared';

interface VworldMapTabProps {
  address?: string;
  restaurantName?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.5;

const VworldMapTab: React.FC<VworldMapTabProps> = ({ address, restaurantName }) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const webViewRef = useRef<WebView>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 주소 → 좌표 변환 (지오코딩) - 백엔드 프록시 API 호출
  useEffect(() => {
    const fetchCoordinates = async () => {
      if (!address) {
        setError('주소 정보가 없습니다');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = getDefaultApiUrl();
        const response = await fetch(
          `${apiUrl}/api/vworld/geocode?address=${encodeURIComponent(address)}`
        );
        const data = await response.json();

        if (data.result && data.data) {
          setCoordinates(data.data);
        } else {
          setError('주소를 좌표로 변환할 수 없습니다');
        }
      } catch (err) {
        setError('지오코딩 중 오류가 발생했습니다');
        console.error('Geocoding error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoordinates();
  }, [address]);

  // VWorld 지도 URL 생성
  const getVworldMapUrl = () => {
    if (!coordinates) return null;
    return `https://map.vworld.kr/map/maps.do?x=${coordinates.lng}&y=${coordinates.lat}&z=17`;
  };

  // 외부 브라우저에서 열기
  const openInBrowser = async () => {
    const url = getVworldMapUrl();
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (err) {
        console.error('Error opening VWorld map:', err);
      }
    }
  };

  // 주소가 없는 경우
  if (!address) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          주소 정보가 없습니다
        </Text>
      </View>
    );
  }

  // 지오코딩 로딩 중
  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          주소를 좌표로 변환 중...
        </Text>
      </View>
    );
  }

  // 에러 발생
  if (error && !coordinates) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
        <Text style={[styles.addressText, { color: colors.textSecondary }]}>
          주소: {address}
        </Text>
      </View>
    );
  }

  const mapUrl = getVworldMapUrl();

  return (
    <View style={styles.container}>
      {/* WebView 지도 */}
      {mapUrl && (
        <View style={styles.webViewContainer}>
          {webViewLoading && (
            <View style={[styles.webViewLoading, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                지도 로딩 중...
              </Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: mapUrl }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            allowsFullscreenVideo={false}
            mixedContentMode="compatibility"
          />
        </View>
      )}

      {/* 주소 정보 */}
      <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>주소</Text>
          <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
            {address}
          </Text>
        </View>
        {coordinates && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>좌표</Text>
            <Text style={[styles.coordValue, { color: colors.text }]}>
              {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* 외부 브라우저에서 열기 버튼 */}
      <TouchableOpacity
        style={[styles.browserButton, { borderColor: colors.border }]}
        onPress={openInBrowser}
      >
        <Text style={[styles.browserButtonText, { color: colors.primary }]}>
          외부 브라우저에서 열기
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webViewContainer: {
    height: MAP_HEIGHT,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  infoBar: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    width: 40,
  },
  infoValue: {
    fontSize: 13,
    flex: 1,
  },
  coordValue: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  browserButton: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  browserButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  addressText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default VworldMapTab;
