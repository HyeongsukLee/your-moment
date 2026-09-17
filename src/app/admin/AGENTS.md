<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# admin

## 개요
관리자 전용 페이지. 모든 페이지는 `role === "ADMIN"` 필요 — 아니면 `/login`으로 리디렉트. 행사 관리, 사용자·그룹 관리, 사진 업로드, 커버 사진 편집을 담당한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `page.tsx` | 관리자 대시보드 — 개요 및 내비게이션 허브 |
| `events/page.tsx` | 행사 목록, 생성, 관리 |
| `users/page.tsx` | 사용자 목록, 역할 변경, 인스타그램 핸들 관리 |
| `groups/page.tsx` | 그룹 목록 및 생성 |
| `upload/page.tsx` | 사진 일괄 업로드 UI — presigned URL 발급 후 S3에 직접 업로드, index-photo API 호출 |
| `cover/page.tsx` | 행사 커버 사진 선택 목록 |
| `cover/[eventId]/page.tsx` | `CoverEditor` 컴포넌트를 이용한 커버 사진 위치 편집기 |

## AI 에이전트 가이드

### 인증 패턴
모든 관리자 페이지는 다음으로 시작해야 함:
```ts
const session = await auth();
if (session?.user?.role !== "ADMIN") redirect("/login");
```

### 업로드 플로우
1. 클라이언트가 `/api/admin/upload-url`에서 presigned URL 요청
2. 클라이언트가 S3에 직접 PUT 업로드
3. 클라이언트가 S3 키와 함께 `/api/admin/index-photo` 호출
4. 서버가 `Photo` 레코드 생성 및 `rekognition.indexFace()` 호출
5. 업로드 완료 후 `/api/admin/events/[eventId]/notify-upload`로 알림 발송

### 커버 에디터
`cover/[eventId]/page.tsx`는 `src/components/CoverEditor.tsx`를 사용하고, `/api/admin/set-cover`를 호출해 `Event.coverPhotoId`와 `Event.coverPosition`을 저장한다.

## 의존성

### 내부
- `src/lib/auth.ts` — 인증 가드
- `src/lib/admin.ts` — `requireAdmin()`
- `src/components/CoverEditor.tsx`
- `src/app/api/admin/` 하위 API 라우트

<!-- MANUAL: -->
