<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api

## 개요
모든 Next.js App Router API 라우트 핸들러. 각 하위 디렉토리가 API 엔드포인트 그룹에 대응한다. `route.ts` 파일에서 `GET`, `POST`, `PUT`, `DELETE`, `PATCH` 함수를 named export로 내보낸다.

## 하위 디렉토리

| 디렉토리 | 역할 |
|----------|------|
| `admin/` | 관리자 전용 작업: 행사·사용자·그룹·업로드·커버·삭제 (`admin/AGENTS.md` 참고) |
| `auth/[...nextauth]/` | NextAuth v5 캐치올 핸들러 — 직접 수정 금지 (`auth/AGENTS.md` 참고) |
| `search/` | 얼굴 검색 시작 및 결과 폴링 (`search/AGENTS.md` 참고) |
| `events/` | 공개 행사 목록 및 사진 조회 (`events/AGENTS.md` 참고) |
| `me/` | 현재 사용자 프로필 및 매칭된 사진 (`me/AGENTS.md` 참고) |
| `notifications/` | 알림 목록 및 읽음 처리 (`notifications/AGENTS.md` 참고) |
| `download/` | 사진 presigned 일괄 다운로드 (`download/AGENTS.md` 참고) |

## AI 에이전트 가이드

### 응답 컨벤션
```ts
return NextResponse.json({ data }, { status: 200 });
return NextResponse.json({ error: "권한 없음" }, { status: 403 });
return NextResponse.json({ error: "찾을 수 없음" }, { status: 404 });
```

### API 라우트에서의 인증
`src/lib/admin.ts`의 가드 함수 사용:
```ts
const session = await requireAdmin();
if (!session) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
```
일반 참가자 수준 인증: `const session = await auth(); if (!session) return 401`

### 미들웨어 없음
인증 강제는 라우트별로 수행하며, Next.js 미들웨어를 사용하지 않는다. 모든 보호된 라우트가 자체적으로 가드를 호출해야 한다.

## 의존성

### 내부
- `src/lib/auth.ts` — `auth()`
- `src/lib/admin.ts` — 역할 가드
- `src/lib/db.ts` — DB 쿼리
- `src/lib/s3.ts` — S3 작업
- `src/lib/rekognition.ts` — 얼굴 작업

<!-- MANUAL: -->
