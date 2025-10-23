#!/usr/bin/env python3
"""
문서 링크 검증 스크립트
모든 .md 파일에서 마크다운 링크를 찾아 실제 파일이 존재하는지 확인
"""

import os
import re
from pathlib import Path

def find_markdown_files(root_dir):
    """모든 .md 파일 찾기"""
    md_files = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.md'):
                md_files.append(Path(root) / file)
    return md_files

def extract_links(content):
    """마크다운 링크 추출: [text](path.md)"""
    # 마크다운 링크 패턴: [텍스트](경로)
    pattern = r'\[([^\]]+)\]\(([^)]+\.md)\)'
    matches = re.findall(pattern, content)
    return [(text, link) for text, link in matches]

def resolve_path(current_file, link):
    """상대 경로 해석"""
    current_dir = current_file.parent

    # 절대 경로인 경우
    if link.startswith('/'):
        return Path(link)

    # 상대 경로인 경우
    resolved = (current_dir / link).resolve()
    return resolved

def main():
    print("=== 문서 링크 검증 시작 ===")
    print()

    # 프로젝트 루트 디렉토리
    project_root = Path(__file__).parent.parent
    docs_dir = project_root / "docs" / "claude"

    if not docs_dir.exists():
        print(f"❌ 문서 디렉토리를 찾을 수 없습니다: {docs_dir}")
        return 1

    # 모든 .md 파일 찾기
    md_files = find_markdown_files(docs_dir)
    print(f"검증할 파일 수: {len(md_files)}")
    print()

    broken_links = []
    total_links = 0

    # 각 파일 검증
    for md_file in sorted(md_files):
        rel_path = md_file.relative_to(project_root)

        # 파일 내용 읽기
        try:
            content = md_file.read_text(encoding='utf-8')
        except Exception as e:
            print(f"⚠️  파일 읽기 실패: {rel_path} - {e}")
            continue

        # 링크 추출
        links = extract_links(content)

        if not links:
            continue

        print(f"검증 중: {rel_path} ({len(links)}개 링크)")

        for text, link in links:
            total_links += 1

            # 외부 링크는 건너뛰기
            if link.startswith('http://') or link.startswith('https://'):
                continue

            # 경로 해석
            resolved_path = resolve_path(md_file, link)

            # 파일 존재 여부 확인
            if not resolved_path.exists():
                broken_links.append({
                    'file': rel_path,
                    'text': text,
                    'link': link,
                    'expected': resolved_path.relative_to(project_root) if resolved_path.is_relative_to(project_root) else resolved_path
                })
                print(f"  ❌ 깨진 링크: [{text}]({link})")

    print()
    print("=== 검증 완료 ===")
    print(f"총 링크 수: {total_links}")
    print(f"깨진 링크: {len(broken_links)}")
    print()

    if broken_links:
        print("[ERROR] 깨진 링크 목록:")
        print()
        for item in broken_links:
            print(f"파일: {item['file']}")
            print(f"  텍스트: {item['text']}")
            print(f"  링크: {item['link']}")
            print(f"  예상 경로: {item['expected']}")
            print()

        # 에러 파일 저장
        error_file = project_root / "link-verification-errors.txt"
        with open(error_file, 'w', encoding='utf-8') as f:
            f.write("=== 깨진 링크 목록 ===\n\n")
            for item in broken_links:
                f.write(f"파일: {item['file']}\n")
                f.write(f"  텍스트: {item['text']}\n")
                f.write(f"  링크: {item['link']}\n")
                f.write(f"  예상 경로: {item['expected']}\n\n")

        print(f"상세 정보가 {error_file.name} 파일에 저장되었습니다.")
        return 1
    else:
        print("[SUCCESS] 모든 링크가 올바릅니다!")

        # 이전 에러 파일 삭제
        error_file = project_root / "link-verification-errors.txt"
        if error_file.exists():
            error_file.unlink()

        return 0

if __name__ == "__main__":
    exit(main())
