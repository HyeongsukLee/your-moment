<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/search

## 개요
얼굴 검색 API. 셀카를 받아 S3에 저장하고 Rekognition 얼굴 검색을 실행한 뒤 결과를 저장한다. 클라이언트가 블로킹 없이 상태를 확인할 수 있도록 비동기 폴링을 지원한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `route.ts` | POST — 셀카(multipart) 수신, `Search` 레코드 생성, S3에 셀카 저장, `searchFacesByImage` 실행, `SearchResult` 레코드 저장 |
| `[searchId]/route.ts` | GET — 특정 `searchId`의 검색 상태 및 결과 반환 |
| `latest/route.ts` | GET — 특정 행사에서 사용자의 가장 최근 검색 반환 (중복 검색 방지) |

## AI 에이전트 가이드

### 검색 실행 흐름 (route.ts POST)
1. 사용자 인증 (`auth()`)
2. multipart 셀카 바이트 파싱
3. `putObject(selfieKey, bytes)`로 S3에 셀카 저장
4. `searchFacesByImage(bytes)` → `{ Face: { ExternalImageId }, Similarity }` 배열 반환
5. `ExternalImageId` = `Photo.id` — DB에서 사진 레코드 조회
6. 유사도 점수와 함께 `SearchResult` 레코드 일괄 삽입
7. `{ searchId }` 반환

### 유사도
Rekognition 임계값 80%. 결과는 유사도 내림차순 정렬. `SearchResult.similarity`에 0~100 float 값 저장.

### 인증
모든 라우트는 로그인 세션 필요 — 세션 없으면 401 반환.

## 의존성

### 내부
- `src/lib/auth.ts` — 세션
- `src/lib/db.ts` — Search/SearchResult/Photo 쿼리
- `src/lib/s3.ts` — 셀카 저장용 `putObject`
- `src/lib/rekognition.ts` — `searchFacesByImage`

<!-- MANUAL: -->
