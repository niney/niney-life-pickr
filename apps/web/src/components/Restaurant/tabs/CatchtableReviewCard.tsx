import React from 'react'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { CatchtableReviewData } from '@shared/services'

interface CatchtableReviewCardProps {
  review: CatchtableReviewData
}

// 점수 프로그레스 바 컴포넌트
const ScoreBar: React.FC<{
  label: string
  score: number | null
  color: string
  bgColor: string
}> = ({ label, score, color, bgColor }) => {
  const percentage = score ? (score / 5) * 100 : 0

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: '500',
            color: bgColor,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: color,
            fontFamily: "'DM Mono', 'Consolas', monospace",
          }}
        >
          {score?.toFixed(1) || '-'}
        </span>
      </div>
      <div
        style={{
          height: 4,
          backgroundColor: `${bgColor}20`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            borderRadius: 2,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  )
}

// 작성자 등급 뱃지
const GradeBadge: React.FC<{ grade: string | null; isDark: boolean }> = ({ grade, isDark }) => {
  if (!grade) return null

  const getGradeStyle = () => {
    const gradeUpper = grade.toUpperCase()
    if (gradeUpper.includes('VIP') || gradeUpper.includes('DIAMOND')) {
      return {
        bg: 'linear-gradient(135deg, #C9A962 0%, #F4E4BA 50%, #C9A962 100%)',
        text: '#1A1A1A',
        shadow: '0 2px 8px rgba(201, 169, 98, 0.4)',
      }
    }
    if (gradeUpper.includes('GOLD') || gradeUpper.includes('프리미엄')) {
      return {
        bg: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
        text: '#1A1A1A',
        shadow: '0 2px 8px rgba(212, 175, 55, 0.4)',
      }
    }
    if (gradeUpper.includes('SILVER')) {
      return {
        bg: 'linear-gradient(135deg, #9CA3AF 0%, #E5E7EB 50%, #9CA3AF 100%)',
        text: '#1A1A1A',
        shadow: '0 2px 8px rgba(156, 163, 175, 0.4)',
      }
    }
    return {
      bg: isDark ? '#374151' : '#E5E7EB',
      text: isDark ? '#D1D5DB' : '#4B5563',
      shadow: 'none',
    }
  }

  const style = getGradeStyle()

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        background: style.bg,
        color: style.text,
        fontSize: 10,
        fontWeight: '700',
        borderRadius: 4,
        letterSpacing: '0.5px',
        boxShadow: style.shadow,
      }}
    >
      {grade}
    </span>
  )
}

const CatchtableReviewCard: React.FC<CatchtableReviewCardProps> = ({ review }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const isDark = theme === 'dark'

  // 날짜 포맷
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // 골드 악센트 컬러 (캐치테이블 프리미엄 느낌)
  const accentGold = '#C9A962'
  const accentLight = isDark ? '#F4E4BA' : '#8B7355'

  return (
    <div
      style={{
        background: isDark
          ? 'linear-gradient(145deg, #1F2937 0%, #111827 100%)'
          : 'linear-gradient(145deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* 상단 헤더 - 총점 강조 */}
      <div
        style={{
          background: isDark
            ? `linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(31, 41, 55, 0.5) 100%)`
            : `linear-gradient(135deg, rgba(201, 169, 98, 0.1) 0%, rgba(255, 255, 255, 0.5) 100%)`,
          padding: '16px 20px',
          borderBottom: `1px solid ${isDark ? 'rgba(201, 169, 98, 0.2)' : 'rgba(201, 169, 98, 0.15)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 작성자 정보 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 프로필 이미지 또는 아바타 */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: review.writer_profile_thumb_url
                ? `url(${review.writer_profile_thumb_url}) center/cover`
                : `linear-gradient(135deg, ${accentGold} 0%, ${accentLight} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
              border: `2px solid ${isDark ? 'rgba(201, 169, 98, 0.3)' : 'rgba(201, 169, 98, 0.2)'}`,
            }}
          >
            {!review.writer_profile_thumb_url && (
              <span style={{ color: '#1A1A1A', fontSize: 18, fontWeight: '700' }}>
                {review.writer_display_name?.charAt(0) || '?'}
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.text,
                }}
              >
                {review.writer_display_name || '익명'}
              </span>
              <GradeBadge grade={review.writer_grade} isDark={isDark} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: colors.textSecondary }}>
                {formatDate(review.reg_date)}
              </span>
              {review.writer_total_review_cnt && (
                <span
                  style={{
                    fontSize: 11,
                    color: accentGold,
                    fontWeight: '500',
                  }}
                >
                  리뷰 {review.writer_total_review_cnt}개
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 총점 */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: accentGold,
              lineHeight: 1,
              fontFamily: "'DM Mono', 'Consolas', monospace",
              textShadow: isDark ? '0 2px 12px rgba(201, 169, 98, 0.4)' : 'none',
            }}
          >
            {review.total_score?.toFixed(1) || '-'}
          </div>
          <div
            style={{
              fontSize: 10,
              color: colors.textSecondary,
              marginTop: 2,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            SCORE
          </div>
        </div>
      </div>

      {/* 점수 상세 */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          gap: 16,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        <ScoreBar
          label="맛"
          score={review.taste_score}
          color="#EF4444"
          bgColor={colors.textSecondary}
        />
        <ScoreBar
          label="분위기"
          score={review.mood_score}
          color="#8B5CF6"
          bgColor={colors.textSecondary}
        />
        <ScoreBar
          label="서비스"
          score={review.service_score}
          color="#10B981"
          bgColor={colors.textSecondary}
        />
      </div>

      {/* 리뷰 내용 */}
      <div style={{ padding: '20px' }}>
        {review.review_content && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: colors.text,
              whiteSpace: 'pre-wrap',
            }}
          >
            {review.review_content}
          </p>
        )}

        {/* 추가 코멘트 */}
        {review.review_comment && (
          <p
            style={{
              margin: '12px 0 0 0',
              fontSize: 13,
              color: colors.textSecondary,
              fontStyle: 'italic',
            }}
          >
            "{review.review_comment}"
          </p>
        )}

        {/* 메타 정보 */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 16,
            flexWrap: 'wrap',
          }}
        >
          {review.food_type_label && (
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                color: '#8B5CF6',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: '500',
              }}
            >
              {review.food_type_label}
            </span>
          )}
          {review.reservation_type && (
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: '500',
              }}
            >
              {review.reservation_type}
            </span>
          )}
          {review.is_take_out === 1 && (
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
                color: '#F97316',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: '500',
              }}
            >
              포장
            </span>
          )}
        </div>
      </div>

      {/* AI 요약 섹션 */}
      {review.summary && review.summary.summary !== '요약 내용이 없습니다' && (
        <div
          style={{
            margin: '0 20px 16px',
            padding: 16,
            background: isDark
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%)',
            borderRadius: 12,
            border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'}`,
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: '#8B5CF6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                AI 요약
              </span>
            </div>
            {/* 감정 뱃지 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {review.summary.satisfactionScore !== null && review.summary.satisfactionScore > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: review.summary.satisfactionScore >= 70 ? '#10B981' : review.summary.satisfactionScore >= 40 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  만족도 {review.summary.satisfactionScore}%
                </span>
              )}
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: '600',
                  backgroundColor:
                    review.summary.sentiment === 'positive'
                      ? isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'
                      : review.summary.sentiment === 'negative'
                        ? isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'
                        : isDark ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.15)',
                  color:
                    review.summary.sentiment === 'positive'
                      ? '#10B981'
                      : review.summary.sentiment === 'negative'
                        ? '#EF4444'
                        : colors.textSecondary,
                }}
              >
                {review.summary.sentiment === 'positive' ? '긍정' : review.summary.sentiment === 'negative' ? '부정' : '중립'}
              </span>
            </div>
          </div>

          {/* 요약 내용 */}
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: colors.text,
            }}
          >
            {review.summary.summary}
          </p>

          {/* 키워드 */}
          {review.summary.keyKeywords.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 12,
                flexWrap: 'wrap',
              }}
            >
              {review.summary.keyKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                    color: '#6366F1',
                    fontSize: 11,
                    borderRadius: 4,
                    fontWeight: '500',
                  }}
                >
                  #{keyword}
                </span>
              ))}
            </div>
          )}

          {/* 메뉴 아이템 */}
          {review.summary.menuItems && review.summary.menuItems.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                언급된 메뉴
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {review.summary.menuItems.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: '500',
                      backgroundColor:
                        item.sentiment === 'positive'
                          ? isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
                          : item.sentiment === 'negative'
                            ? isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'
                            : isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
                      color:
                        item.sentiment === 'positive'
                          ? '#10B981'
                          : item.sentiment === 'negative'
                            ? '#EF4444'
                            : colors.textSecondary,
                    }}
                    title={item.reason || ''}
                  >
                    {item.sentiment === 'positive' ? '👍 ' : item.sentiment === 'negative' ? '👎 ' : ''}
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 팁 */}
          {review.summary.tips && review.summary.tips.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                💡 팁
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontSize: 12,
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {review.summary.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 사장님 답글 */}
      {review.boss_reply && (
        <div
          style={{
            margin: '0 20px 20px',
            padding: 16,
            background: isDark
              ? 'linear-gradient(135deg, rgba(201, 169, 98, 0.08) 0%, rgba(201, 169, 98, 0.03) 100%)'
              : 'linear-gradient(135deg, rgba(201, 169, 98, 0.06) 0%, rgba(201, 169, 98, 0.02) 100%)',
            borderRadius: 12,
            borderLeft: `3px solid ${accentGold}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>👨‍🍳</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: accentGold,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              사장님 답글
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: colors.textSecondary,
            }}
          >
            {review.boss_reply}
          </p>
        </div>
      )}

      {/* 하단 반응 정보 */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
          display: 'flex',
          gap: 16,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: colors.textSecondary,
          }}
        >
          <span style={{ fontSize: 14 }}>❤️</span>
          {review.like_cnt}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: colors.textSecondary,
          }}
        >
          <span style={{ fontSize: 14 }}>💬</span>
          {review.reply_cnt}
        </span>
      </div>
    </div>
  )
}

export default CatchtableReviewCard
