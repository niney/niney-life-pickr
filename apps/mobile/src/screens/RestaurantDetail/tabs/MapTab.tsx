import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, THEME_COLORS } from 'shared';

interface MapTabProps {
  placeId?: string;
  onOpenMap: (placeId: string) => void;
}

const MapTab: React.FC<MapTabProps> = ({ placeId, onOpenMap }) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  if (!placeId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          지도 정보가 없습니다
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        네이버 지도에서 위치를 확인하세요
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => onOpenMap(placeId)}
      >
        <Text style={styles.buttonText}>
          🗺️ 네이버 지도에서 열기
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
});

export default MapTab;
