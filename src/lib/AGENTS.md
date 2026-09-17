<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# lib

## 개요
서버 사이드 유틸리티 모듈. API 라우트와 서버 컴포넌트에서 임포트한다. AWS 자격증명과 DB 접근이 포함되어 있으므로 `"use client"` 컴포넌트에서 절대 임포트하지 말 것.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `db.ts` | Prisma 클라이언트 싱글톤 — 반드시 여기서 임포트, `new PrismaClient()` 직접 생성 금지 |
| `auth.ts` | NextAuth v5 설정: 카카오·구글·테스트 프로바이더, `ensureUser`, JWT·세션 콜백. `auth`, `handlers`, `signIn`, `signOut` 내보냄 |
| `admin.ts` | 역할 기반 가드: `requireAdmin()`, `requireStaff()`, `canUploadToEvent(eventId)`, `canDeletePhoto(photoId)` |
| `s3.ts` | AWS S3 클라이언트 + 헬퍼: `getPresignedUploadUrl`, `getPresignedDownloadUrl`, `putObject`, `resolveImageUrl`, `deleteObjects` |
| `rekognition.ts` | AWS Rekognition 헬퍼: `indexFace`, `searchFacesByImage`, `searchFacesByS3`, `deleteFaces`, `ensureCollection` |
| `code.ts` | `generateCode()` — 그룹·행사 참여 링크용 nanoid 8자 단축 코드 생성 |
| `download.ts` | 여러 사진 일괄 다운로드 헬퍼 |

## AI 에이전트 가이드

### 인증 가드 (admin.ts)
API 라우트에서 사용 — 내부적으로 `auth()`를 호출함:
```ts
await requireAdmin()           // ADMIN만 → 아니면 null 반환
await requireStaff()           // ADMIN 또는 PHOTOGRAPHER
await canUploadToEvent(id)     // ADMIN 또는 그룹 멤버 PHOTOGRAPHER
await canDeletePhoto(id)       // ADMIN 또는 사진 업로더 본인
```

### S3 키 컨벤션
- 원본 사진: `events/<eventId>/photos/<photoId>.jpg`
- 썸네일: `events/<eventId>/thumbs/<photoId>.jpg`
- 셀카: `searches/<searchId>/selfie.jpg`
- 시드/데모 데이터: 키가 `http://`로 시작하는 경우도 있음 — `resolveImageUrl()`이 양쪽 모두 처리

### Rekognition 컬렉션
단일 공유 컬렉션(`AWS_REKOGNITION_COLLECTION` 환경변수). `ExternalImageId`는 `Photo.id`로 설정해 얼굴 매칭 결과를 DB 레코드와 연결. 매칭 임계값 80%.

### 필수 환경변수
모든 lib 파일은 `process.env`에서 값을 읽음 — `.env.local`에 반드시 설정:
- `DATABASE_URL`, `DIRECT_URL`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `AWS_S3_BUCKET`, `AWS_REKOGNITION_COLLECTION`

## 의존성

### 외부
- `@prisma/client` — `db.ts`의 DB 접근
- `next-auth` v5 — `auth.ts`
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` — `s3.ts`
- `@aws-sdk/client-rekognition` — `rekognition.ts`
- `nanoid` — `code.ts`

<!-- MANUAL: -->
