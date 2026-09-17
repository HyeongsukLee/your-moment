<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/download

## 개요
사진 일괄 다운로드 엔드포인트. 선택한 사진들의 원본(썸네일 아님) S3 presigned GET URL을 생성해 클라이언트에 반환한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `route.ts` | POST — 사진 ID 배열을 받아 접근 권한 확인 후, 원본 `s3Key` 파일의 presigned 다운로드 URL 반환 |

## AI 에이전트 가이드

- 썸네일(`thumbnailKey`)이 아닌 원본(`s3Key`) URL 반환
- 접근 권한 확인: 사용자가 각 사진과 연결된 `SearchResult`를 갖고 있어야 함 (또는 ADMIN)
- URL 만료: 1시간 (표준 presigned URL 만료)
- `MomentBrowser` 및 `me/page.tsx`의 다운로드 액션에서 사용

## 의존성

### 내부
- `src/lib/auth.ts` — `auth()`
- `src/lib/db.ts` — 사진 접근 권한 확인
- `src/lib/s3.ts` — `getPresignedDownloadUrl()`
- `src/lib/download.ts` — 일괄 다운로드 헬퍼

<!-- MANUAL: -->
