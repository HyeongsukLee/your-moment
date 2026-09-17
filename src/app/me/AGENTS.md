<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# me

## 개요
사용자 프로필 페이지. 현재 사용자의 정보와 전체 행사에서 얼굴이 인식된 모든 사진을 보여준다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `page.tsx` | 프로필 페이지 — `/api/me`(사용자 정보)와 `/api/me/photos`(매칭 사진 전체) 조회 |

## AI 에이전트 가이드

- 인증 필요 — 세션 없으면 `/login`으로 리디렉트
- "내 사진"은 사용자의 `Search` 항목과 연결된 모든 `SearchResult` 레코드를 집계
- 사진 그리드 표시에 `MomentBrowser` 컴포넌트 사용
- 다운로드 액션은 선택한 사진 키와 함께 `/api/download`로 라우팅

## 의존성

### 내부
- `src/components/MomentBrowser.tsx` — 사진 그리드
- `src/app/api/me/` — 사용자 및 사진 데이터 엔드포인트

<!-- MANUAL: -->
