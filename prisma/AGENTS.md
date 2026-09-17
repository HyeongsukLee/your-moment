<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# prisma

## 개요
Prisma ORM 기반 DB 스키마 및 시드 데이터. your-moment 플랫폼의 PostgreSQL 데이터베이스에 사용되는 모든 모델, Enum, 관계를 정의한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `schema.prisma` | 전체 DB 스키마 — 모델: User, Group, Event, Photo, Search, SearchResult, Notification |
| `seed.ts` | 로컬 개발용 테스트 계정(`*@yourmoment.local`) 및 샘플 데이터 시드 |

## 데이터 모델 요약

| 모델 | 주요 필드 |
|------|----------|
| `User` | id, email, kakaoId, role(PARTICIPANT/PHOTOGRAPHER/ADMIN), instagram |
| `Group` | id, name, code(참여 링크용) |
| `Event` | id, name, date, groupId, code(공유 링크용), coverPhotoId, isActive |
| `Photo` | id, eventId, s3Key, thumbnailKey, rekognitionId, uploaderId |
| `Search` | id, userId, eventId, selfieKey |
| `SearchResult` | searchId, photoId, similarity(float) |
| `Notification` | userId, type, title, body, eventId, read |

## AI 에이전트 가이드

### 스키마 변경 시
```bash
npm run db:push    # DB에 스키마 변경 적용 (.env.local 사용)
npm run db:seed    # 테스트 데이터 재시드
```
`schema.prisma` 수정 후 API 라우트 테스트 전에 반드시 `db:push` 실행.

### 컨벤션
- 모든 ID는 `cuid()` — auto-increment 정수 사용 금지
- 스키마의 한글 주석은 의도적인 것 — 수정 시 유지할 것
- `Event.coverPhotoId`는 nullable; UI는 null이면 첫 번째 사진으로 폴백
- `Photo.rekognitionId`는 S3 업로드 후 index-photo API 라우트에서 채워짐

## 의존성

### 내부
- `src/lib/db.ts` — 생성된 Prisma 클라이언트 임포트

### 외부
- `@prisma/client` 6, `prisma` 6
- `tsx` (seed.ts TypeScript 실행용)

<!-- MANUAL: -->
