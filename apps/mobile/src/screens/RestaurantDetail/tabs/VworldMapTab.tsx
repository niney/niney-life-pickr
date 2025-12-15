import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme, THEME_COLORS, getDefaultApiUrl } from 'shared';

interface VworldMapTabProps {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  restaurantName?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.5;

// 서울 시청 좌표 (기본값)
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const DEFAULT_ZOOM = 17;

const VworldMapTab: React.FC<VworldMapTabProps> = ({
  lat,
  lng,
  address,
  restaurantName
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const webViewRef = useRef<WebView>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );
  const [vworldConfig, setVworldConfig] = useState<{ apiKey: string; wmtsUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // VWorld 설정 로드
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const apiUrl = getDefaultApiUrl();
        const response = await fetch(`${apiUrl}/api/vworld/config`);
        const data = await response.json();

        if (data.result && data.data) {
          setVworldConfig(data.data);
        } else {
          setError('VWorld 설정을 불러올 수 없습니다');
        }
      } catch (err) {
        setError('VWorld 설정 로드 중 오류가 발생했습니다');
        console.error('VWorld config error:', err);
      }
    };

    fetchConfig();
  }, []);

  // 주소 → 좌표 변환 (지오코딩) - 백엔드 프록시 API 호출
  useEffect(() => {
    const fetchCoordinates = async () => {
      // 이미 좌표가 있으면 스킵
      if (lat && lng) {
        setCoordinates({ lat, lng });
        return;
      }

      // 주소가 있으면 지오코딩 시도
      if (address) {
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
      } else {
        setError('주소 정보가 없습니다');
      }
    };

    fetchCoordinates();
  }, [lat, lng, address]);

  // OpenLayers 지도 HTML 생성
  const mapHtml = useMemo(() => {
    if (!vworldConfig) return null;

    const center = coordinates || DEFAULT_CENTER;
    const { apiKey, wmtsUrl } = vworldConfig;
    console.log('vworldConfig', vworldConfig);
    const markerColor = colors.primary;
    const textColor = colors.text;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v8.2.0/ol.css">
  <script src="https://cdn.jsdelivr.net/npm/ol@v8.2.0/dist/ol.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function() {
      const center = ol.proj.fromLonLat([${center.lng}, ${center.lat}]);

      // VWorld 배경지도 레이어
      const vworldBaseLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: '${wmtsUrl}/${apiKey}/Base/{z}/{y}/{x}.png',
          crossOrigin: 'anonymous',
        }),
      });

      // 지도 뷰 생성
      const view = new ol.View({
        center: center,
        zoom: ${DEFAULT_ZOOM},
      });

      // 지도 생성
      const map = new ol.Map({
        target: 'map',
        layers: [vworldBaseLayer],
        view: view,
        controls: ol.control.defaults.defaults({ zoom: true, rotate: false, attribution: false }),
      });

      ${coordinates ? `
      // 마커 추가
      const markerFeature = new ol.Feature({
        geometry: new ol.geom.Point(center),
        name: '${(restaurantName || '위치').replace(/'/g, "\\'")}',
      });

      // 마커 스타일 (SVG 아이콘)
      const markerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48"><path fill="${markerColor}" stroke="#fff" stroke-width="2" d="M16 2C8.268 2 2 8.268 2 16c0 10 14 30 14 30s14-20 14-30c0-7.732-6.268-14-14-14z"/><circle fill="#fff" cx="16" cy="16" r="6"/></svg>';

      const markerStyle = new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 1],
          src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markerSvg),
          scale: 1,
        }),
        text: new ol.style.Text({
          text: '${(restaurantName || '').replace(/'/g, "\\'")}',
          offsetY: -55,
          font: 'bold 14px sans-serif',
          fill: new ol.style.Fill({ color: '${textColor}' }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
        }),
      });

      markerFeature.setStyle(markerStyle);

      const vectorSource = new ol.source.Vector({
        features: [markerFeature],
      });

      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
      });

      map.addLayer(vectorLayer);
      ` : ''}
    })();
  </script>
</body>
</html>
    `;
  }, [coordinates, vworldConfig, restaurantName, colors.primary, colors.text]);

  // 외부 브라우저에서 열기
  const openInBrowser = async () => {
    if (!coordinates) return;
    const url = `https://map.vworld.kr/map/maps.do?x=${coordinates.lng}&y=${coordinates.lat}&z=17`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening VWorld map:', err);
    }
  };

  // 설정이 없는 경우
  if (!vworldConfig && !error) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          설정 로드 중...
        </Text>
      </View>
    );
  }

  // 주소가 없는 경우
  if (!address && !lat && !lng) {
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
        {address && (
          <Text style={[styles.addressText, { color: colors.textSecondary }]}>
            주소: {address}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WebView 지도 (OpenLayers) */}
      {mapHtml && (
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
            source={{ html: mapHtml }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={false}
            scrollEnabled={false}
            bounces={false}
            allowsFullscreenVideo={false}
            mixedContentMode="compatibility"
            originWhitelist={['*']}
          />
        </View>
      )}

      {/* 주소 정보 */}
      <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
        {address && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>주소</Text>
            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
              {address}
            </Text>
          </View>
        )}
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
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
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
