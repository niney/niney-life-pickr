import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faStarHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons'

/**
 * 별점 렌더링 함수 (0~100 점수를 1~5 별점으로 변환, 반별 포함)
 */
export const renderStars = (score: number, borderColor: string) => {
  const normalizedScore = score / 20 // 0-100 → 0-5

  return [1, 2, 3, 4, 5].map((position) => {
    const diff = normalizedScore - position + 1
    let icon
    let color = '#ffc107' // 금색

    if (diff >= 0.75) {
      icon = faStar // 채운 별
    } else if (diff >= 0.25) {
      icon = faStarHalfStroke // 반별
    } else {
      icon = farStar // 빈 별
      color = borderColor // 회색
    }

    return (
      <FontAwesomeIcon
        key={position}
        icon={icon}
        style={{ fontSize: 16, color, marginRight: 2 }}
      />
    )
  })
}
