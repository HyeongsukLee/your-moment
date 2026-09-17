<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/me

## 개요
현재 사용자의 프로필 및 행사 전체에 걸친 사진 집계 엔드포인트.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `route.ts` | GET — 현재 사용자의 프로필 데이터(이름, 이미지, 역할, 인스타그램, 그룹) 반환 |
| `photos/route.ts` | GET — 전체 행사에서 현재 사용자와 매칭된 사진 목록 반환 (SearchResult 기반) |

## AI 에이전트 가이드

- 두 라우트 모두 인증 필요 (세션 없으면 401)
- `photos/route.ts`는 현재 사용자의 `Search → SearchResult → Photo`를 조인하며 `createdAt` 내림차순 정렬
- `resolveImageUrl()`로 presigned 썸네일 URL 반환
- `src/app/me/page.tsx`에서 사용

## 의존성

### 내부
- `src/lib/auth.ts` — `auth()`
- `src/lib/db.ts` — 사용자/검색/사진 쿼리
- `src/lib/s3.ts` — `resolveImageUrl()`

<!-- MANUAL: -->
