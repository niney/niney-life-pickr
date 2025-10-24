import React from 'react'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { renderStars } from '../utils/starRating'
import type { AISummaryProps } from './types'

const AISummarySection: React.FC<AISummaryProps> = ({
  summary,
  expandedKeywords,
  onToggleKeywords,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const sentimentColor =
    summary.sentiment === 'positive' ? '#4caf50' : summary.sentiment === 'negative' ? '#f44336' : '#ff9800'

  const sentimentLabel =
    summary.sentiment === 'positive' ? '😊 긍정' : summary.sentiment === 'negative' ? '😞 부정' : '😐 중립'

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid',
        backgroundColor: theme === 'light' ? '#f5f5ff' : '#1a1a2e',
        borderColor: theme === 'light' ? '#e0e0ff' : '#2d2d44',
        marginBottom: 12,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: '700', color: '#9c27b0' }}>🤖 AI 요약</span>
        <span
          style={{
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 12,
            fontSize: 13,
            fontWeight: '600',
            color: sentimentColor,
          }}
        >
          {sentimentLabel}
        </span>
      </div>

      {/* 요약 텍스트 */}
      <div
        style={{
          fontSize: 15,
          lineHeight: '22px',
          marginBottom: 12,
          color: colors.text,
        }}
      >
        {summary.summary}
      </div>

      {/* 핵심 키워드 (토글) */}
      {summary.keyKeywords.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={onToggleKeywords}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: '600',
              color: colors.textSecondary,
            }}
          >
            핵심 키워드 {expandedKeywords ? '▼' : '▶'}
          </button>
          {expandedKeywords && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 8,
              }}
            >
              {summary.keyKeywords.map((keyword: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 5,
                    paddingBottom: 5,
                    borderRadius: 6,
                    backgroundColor: '#e1bee7',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: '500', color: '#6a1b9a' }}>
                    {keyword}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 만족도 점수 */}
      {summary.satisfactionScore !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
            만족도:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {renderStars(summary.satisfactionScore, colors.border)}
            <span
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.text,
                marginLeft: 6,
              }}
            >
              {summary.satisfactionScore}점
            </span>
          </div>
        </div>
      )}

      {/* 언급된 메뉴 */}
      {summary.menuItems && summary.menuItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            🍽️ 언급된 메뉴:
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 6,
            }}
          >
            {summary.menuItems.map((menuItem, idx: number) => {
              const sentimentConfig = {
                positive: {
                  emoji: '😊',
                  bgLight: '#c8e6c9',
                  bgDark: '#2e5d2e',
                  textLight: '#1b5e20',
                  textDark: '#a5d6a7',
                  borderLight: '#66bb6a',
                  borderDark: '#4caf50',
                },
                negative: {
                  emoji: '😞',
                  bgLight: '#ffcdd2',
                  bgDark: '#5d2e2e',
                  textLight: '#b71c1c',
                  textDark: '#ef9a9a',
                  borderLight: '#ef5350',
                  borderDark: '#e57373',
                },
                neutral: {
                  emoji: '😐',
                  bgLight: '#ffe0b2',
                  bgDark: '#5d4a2e',
                  textLight: '#e65100',
                  textDark: '#ffcc80',
                  borderLight: '#ff9800',
                  borderDark: '#ffb74d',
                },
              }

              const config = sentimentConfig[menuItem.sentiment]
              const bgColor = theme === 'light' ? config.bgLight : config.bgDark
              const textColor = theme === 'light' ? config.textLight : config.textDark
              const borderColor = theme === 'light' ? config.borderLight : config.borderDark

              return (
                <div
                  key={idx}
                  style={{
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 6,
                    paddingBottom: 6,
                    borderRadius: 8,
                    border: `1.5px solid ${borderColor}`,
                    backgroundColor: bgColor,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: '600', color: textColor }}>
                    <span style={{ fontSize: 14 }}>{config.emoji}</span> {menuItem.name}
                    {menuItem.reason && ` (${menuItem.reason})`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 팁 */}
      {summary.tips.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            💡 팁:
          </span>
          {summary.tips.map((tip: string, idx: number) => (
            <div
              key={idx}
              style={{
                fontSize: 14,
                lineHeight: '20px',
                marginBottom: 4,
                color: colors.text,
              }}
            >
              • {tip}
            </div>
          ))}
        </div>
      )}

      {/* 감정 분석 이유 */}
      {summary.sentimentReason && (
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            감정 분석:
          </span>
          <div
            style={{
              fontSize: 14,
              lineHeight: '20px',
              fontStyle: 'italic',
              color: colors.text,
            }}
          >
            {summary.sentimentReason}
          </div>
        </div>
      )}
    </div>
  )
}

export default AISummarySection
