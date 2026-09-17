<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# login

## 개요
로그인 페이지. 카카오(주), 구글 OAuth 버튼을 렌더링하며, 개발 모드 또는 `ENABLE_SIMPLE_LOGIN=true`일 때 테스트 계정 선택기도 표시한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `page.tsx` | 로그인 UI — 클라이언트 사이드 OAuth 시작을 위해 `next-auth/react`의 `signIn()` 사용 |

## AI 에이전트 가이드

- `src/lib/auth.ts`의 `pages.signIn`에 설정된 대상 페이지
- 카카오는 이메일을 기본 제공하지 않음 — 앱은 `kakaoId`를 기본 식별자로 사용
- 테스트 계정은 `*@yourmoment.local` 이메일만 허용 (시드된 사용자)
- 로그인 후 next-auth가 `callbackUrl` 쿼리 파라미터 또는 `/`로 리디렉트

## 의존성

### 내부
- `src/lib/auth.ts` — NextAuth 설정 (프로바이더 목록)

### 외부
- `next-auth/react` — `signIn()` 클라이언트 액션

<!-- MANUAL: -->
