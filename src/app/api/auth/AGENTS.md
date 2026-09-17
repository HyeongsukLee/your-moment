<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/auth

## 개요
NextAuth v5 캐치올 라우트 핸들러. OAuth 콜백(카카오, 구글), 세션 관리, 로그인·로그아웃 흐름을 처리한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `[...nextauth]/route.ts` | `src/lib/auth.ts`의 `handlers`에서 `{ GET, POST }`를 재내보내기(re-export) |

## AI 에이전트 가이드

- **비즈니스 로직을 여기에 추가하지 말 것** — 이 파일은 얇은 재내보내기다. 인증 로직은 `src/lib/auth.ts`에 있음
- NextAuth v5는 `handlers` 내보내기 패턴 사용: `export const { GET, POST } = handlers`
- 카카오 OAuth 콜백에서 `account.providerAccountId`가 `kakaoId`로 사용됨
- `auth.ts`의 `signIn` 콜백이 `ensureUser()`를 호출해 사용자를 DB에 upsert함

## 의존성

### 내부
- `src/lib/auth.ts` — 모든 인증 설정 및 핸들러

### 외부
- `next-auth` v5 beta

<!-- MANUAL: -->
