<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# events

## 개요
인증된 참가자를 위한 행사 상세 페이지. 행사 사진을 보여주고 얼굴 검색 진입점을 제공한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `[eventId]/page.tsx` | 행사 상세 — 사진 그리드, 행사 정보, 검색 페이지 링크 |
| `[eventId]/search/page.tsx` | 얼굴 검색 페이지 — 셀카 촬영/업로드, 검색 실행, 결과 표시 |

## AI 에이전트 가이드

### 검색 흐름 (search/page.tsx)
1. 사용자가 카메라 또는 파일 업로드로 셀카 촬영
2. 페이지가 `/api/search`에 셀카를 multipart POST → `searchId` 수신
3. `searchId`가 완료될 때까지 `/api/search/[searchId]` 폴링
4. 유사도 점수 기준 내림차순으로 매칭 사진 표시
5. 결과 그리드 표시에 `MomentBrowser` 컴포넌트 사용

### 인증
두 페이지 모두 로그인 세션 필요 — 미인증 시 `/login`으로 리디렉트.

## 의존성

### 내부
- `src/components/MomentBrowser.tsx` — 사진 그리드 표시
- `src/app/api/search/` — 검색 API 라우트

<!-- MANUAL: -->
