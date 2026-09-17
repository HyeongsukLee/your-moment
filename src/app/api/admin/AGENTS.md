<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/admin

## 개요
관리자 전용 API 라우트. 모든 라우트는 `requireAdmin()`으로 `role === "ADMIN"`을 강제한다. 단, `canUploadToEvent` / `canDeletePhoto`는 특정 조건 하에 PHOTOGRAPHER 역할도 허용한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `upload-url/route.ts` | POST — 클라이언트의 S3 직접 업로드를 위한 presigned PUT URL 반환 |
| `index-photo/route.ts` | POST — S3 업로드 완료 후 `Photo` DB 레코드 생성 및 `rekognition.indexFace()` 호출 |
| `delete-photo/route.ts` | DELETE — S3, Rekognition 컬렉션, DB에서 사진 삭제; `canDeletePhoto()` 사용 (ADMIN 또는 업로더) |
| `set-cover/route.ts` | POST — 커버 에디터용 `Event.coverPhotoId` 및 `Event.coverPosition` 설정 |
| `groups/route.ts` | GET/POST — 그룹 목록 조회 또는 참여 코드가 있는 새 그룹 생성 |
| `events/route.ts` | GET/POST — 행사 목록 조회 또는 새 행사 생성 |
| `events/[eventId]/route.ts` | GET/PUT/DELETE — 단일 행사 CRUD |
| `events/[eventId]/notify-upload/route.ts` | POST — 일괄 업로드 후 그룹 멤버에게 PHOTOS_UPLOADED 알림 발송 |
| `users/route.ts` | GET — 전체 사용자 목록 |
| `users/role/route.ts` | PATCH — 사용자 역할 변경 |
| `users/groups/route.ts` | GET — 특정 사용자의 그룹 조회 |
| `users/assign/route.ts` | POST — 사진작가를 행사에 배정 (레거시) |
| `users/instagram/route.ts` | PATCH — 사진작가 인스타그램 핸들 설정 |

## AI 에이전트 가이드

### 업로드 플로우 (2단계)
```
POST /api/admin/upload-url  → { url, key }   (presigned S3 PUT)
PUT  <url> (S3에 직접 업로드)               (클라이언트가 파일 업로드)
POST /api/admin/index-photo { key, eventId } → Photo 레코드 생성 + 얼굴 인덱싱
```

### 인증
- 대부분의 라우트: `requireAdmin()`
- `delete-photo`: `canDeletePhoto(photoId)` (ADMIN 또는 업로더)
- `upload-url` / `index-photo`: `canUploadToEvent(eventId)`

## 의존성

### 내부
- `src/lib/admin.ts` — `requireAdmin`, `canUploadToEvent`, `canDeletePhoto`
- `src/lib/db.ts` — 모든 DB 작업
- `src/lib/s3.ts` — `getPresignedUploadUrl`, `deleteObjects`
- `src/lib/rekognition.ts` — `indexFace`, `deleteFaces`
- `src/lib/code.ts` — `generateCode()` (새 그룹/행사용)

<!-- MANUAL: -->
