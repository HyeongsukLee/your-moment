<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# app

## 개요
Next.js 16 App Router 루트. your-moment 플랫폼의 모든 페이지, 레이아웃, 전역 스타일, API 라우트 핸들러를 담는다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `layout.tsx` | 루트 레이아웃 — 세션·쿼리 클라이언트 등 프로바이더로 전체 페이지를 감싼다 |
| `page.tsx` | 홈 페이지 — 현재 사용자가 속한 그룹의 행사 목록 |
| `loading.tsx` | 루트 레벨 로딩 스켈레톤 |
| `globals.css` | Tailwind 4 전역 스타일 및 커스텀 `ym-*` 애니메이션 클래스 |
| `favicon.ico` | 앱 아이콘 |

## 하위 디렉토리

| 디렉토리 | 역할 |
|----------|------|
| `admin/` | 관리자 전용 페이지: 행사·사용자·그룹 관리, 사진 업로드, 커버 편집 (`admin/AGENTS.md` 참고) |
| `api/` | 모든 API 라우트 핸들러 (`api/AGENTS.md` 참고) |
| `events/[eventId]/` | 행사 상세 페이지 + 얼굴 검색 (`events/AGENTS.md` 참고) |
| `e/[code]/` | 단축 링크 진입점 — 그룹 가입 흐름으로 리디렉트 (`e/AGENTS.md` 참고) |
| `join/[code]/` | 그룹 참여 확인 페이지 (`join/AGENTS.md` 참고) |
| `login/` | 카카오·구글·테스트 계정 로그인 페이지 (`login/AGENTS.md` 참고) |
| `me/` | 사용자 프로필 및 내 사진 페이지 (`me/AGENTS.md` 참고) |

## AI 에이전트 가이드

### 라우팅 컨벤션
- 동적 세그먼트는 `[param]` 폴더 안의 `page.tsx`로 구성
- 인증 캐치올 라우트: `api/auth/[...nextauth]/route.ts`
- 기본적으로 서버 컴포넌트; 인터랙션이 필요할 때만 `"use client"` 추가

### 페이지에서의 인증 패턴
```ts
import { auth } from "@/lib/auth";
const session = await auth();
if (!session) redirect("/login");
```

### API 라우트에서의 인증 패턴
```ts
import { requireAdmin } from "@/lib/admin"; // 또는 requireStaff, canUploadToEvent
const session = await requireAdmin();
if (!session) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
```

<!-- MANUAL: -->
