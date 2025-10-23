#!/bin/bash

# 링크 검증 스크립트
# 모든 .md 파일에서 마크다운 링크를 찾아 실제 파일이 존재하는지 확인

echo "=== 문서 링크 검증 시작 ==="
echo ""

BROKEN_LINKS=0
TOTAL_LINKS=0
ERRORS_FILE="link-verification-errors.txt"

> "$ERRORS_FILE"  # 파일 초기화

# 모든 .md 파일 순회
find docs/claude -name "*.md" -type f | while read -r file; do
    echo "검증 중: $file"

    # 파일의 디렉토리 경로
    FILE_DIR=$(dirname "$file")

    # 마크다운 링크 추출: [text](path.md)
    grep -o '\[.*\](\..*\.md)' "$file" | sed 's/.*](//' | sed 's/).*//' | while read -r link; do
        TOTAL_LINKS=$((TOTAL_LINKS + 1))

        # 상대 경로 해석
        if [[ "$link" == ./* ]]; then
            # 현재 디렉토리 기준
            RESOLVED_PATH="$FILE_DIR/$link"
        elif [[ "$link" == ../* ]]; then
            # 부모 디렉토리 기준
            RESOLVED_PATH="$FILE_DIR/$link"
        else
            # 절대 경로
            RESOLVED_PATH="$link"
        fi

        # 경로 정규화 (.. 해석)
        RESOLVED_PATH=$(realpath -m "$RESOLVED_PATH" 2>/dev/null || echo "$RESOLVED_PATH")

        # 파일 존재 여부 확인
        if [ ! -f "$RESOLVED_PATH" ]; then
            echo "  ❌ 깨진 링크: $link" | tee -a "$ERRORS_FILE"
            echo "     파일: $file" | tee -a "$ERRORS_FILE"
            echo "     예상 경로: $RESOLVED_PATH" | tee -a "$ERRORS_FILE"
            echo "" | tee -a "$ERRORS_FILE"
            BROKEN_LINKS=$((BROKEN_LINKS + 1))
        fi
    done
done

echo ""
echo "=== 검증 완료 ==="
echo "총 링크 수: $TOTAL_LINKS"
echo "깨진 링크: $BROKEN_LINKS"
echo ""

if [ $BROKEN_LINKS -gt 0 ]; then
    echo "❌ 깨진 링크가 발견되었습니다. $ERRORS_FILE 파일을 확인하세요."
    exit 1
else
    echo "✅ 모든 링크가 올바릅니다!"
    rm -f "$ERRORS_FILE"
    exit 0
fi
