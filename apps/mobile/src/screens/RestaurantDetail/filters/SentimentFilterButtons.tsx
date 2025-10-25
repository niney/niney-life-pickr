import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, THEME_COLORS } from 'shared';

export type SentimentType = 'all' | 'positive' | 'negative' | 'neutral';

interface SentimentFilterButtonsProps {
  selectedFilter: SentimentType;
  onFilterChange: (filter: SentimentType) => void;
}

const SentimentFilterButtons: React.FC<SentimentFilterButtonsProps> = ({
  selectedFilter,
  onFilterChange,
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  const getButtonStyle = (filter: SentimentType) => {
    const baseColor = theme === 'light' ? '#f5f5f5' : colors.surface;
    const isSelected = selectedFilter === filter;

    let selectedColor: string;
    switch (filter) {
      case 'all':
        selectedColor = colors.primary;
        break;
      case 'positive':
        selectedColor = '#4caf50';
        break;
      case 'negative':
        selectedColor = '#f44336';
        break;
      case 'neutral':
        selectedColor = '#ff9800';
        break;
    }

    return {
      backgroundColor: isSelected ? selectedColor : baseColor,
      borderColor: isSelected ? selectedColor : colors.border,
    };
  };

  const getTextStyle = (filter: SentimentType) => ({
    color: selectedFilter === filter ? '#fff' : colors.text,
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, getButtonStyle('all')]}
        onPress={() => onFilterChange('all')}
      >
        <Text style={[styles.buttonText, getTextStyle('all')]}>
          전체
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, getButtonStyle('positive')]}
        onPress={() => onFilterChange('positive')}
      >
        <Text style={[styles.buttonText, getTextStyle('positive')]}>
          😊 긍정
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, getButtonStyle('negative')]}
        onPress={() => onFilterChange('negative')}
      >
        <Text style={[styles.buttonText, getTextStyle('negative')]}>
          😞 부정
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, getButtonStyle('neutral')]}
        onPress={() => onFilterChange('neutral')}
      >
        <Text style={[styles.buttonText, getTextStyle('neutral')]}>
          😐 중립
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SentimentFilterButtons;
