<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/events

## 개요
참가자가 접근 가능한 공개 행사 데이터 엔드포인트. 행사 페이지 표시를 위한 행사 메타데이터와 사진 목록을 반환한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `route.ts` | GET — 현재 사용자에게 보이는 행사 목록 반환 (그룹 멤버십 기준 필터링) |
| `[eventId]/photos/route.ts` | GET — 행사의 페이지네이션된 사진 목록 (presigned 썸네일 URL 포함) |

## AI 에이전트 가이드

- 행사 가시성: 참가자는 자신이 속한 그룹의 행사만 볼 수 있음
- 사진은 `resolveImageUrl()`로 생성된 presigned `thumbnailKey` URL과 함께 반환 (1시간 만료)
- 관리자는 그룹 멤버십 관계없이 모든 행사를 볼 수 있음
- 비활성 행사(`isActive: false`)는 참가자에게 숨겨짐

## 의존성

### 내부
- `src/lib/auth.ts` — `auth()` 세션
- `src/lib/db.ts` — 행사·사진 쿼리
- `src/lib/s3.ts` — 썸네일 URL용 `resolveImageUrl()`

<!-- MANUAL: -->
