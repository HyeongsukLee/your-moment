<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# types

## 개요
서드파티 모듈 타입을 확장하는 TypeScript 선언 파일.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `next-auth.d.ts` | `next-auth`의 Session·JWT 타입 확장 — `session.user`에 `id`(DB 사용자 id)와 `role`(PARTICIPANT/PHOTOGRAPHER/ADMIN) 추가 |

## AI 에이전트 가이드

- 이 파일은 TypeScript 모듈 어그멘테이션(`declare module`) 방식 사용 — `export {}`를 추가하면 어그멘테이션이 깨지므로 금지
- JWT 또는 Session에 새 필드를 추가할 경우: 이 파일의 `JWT` 인터페이스와 `Session["user"]` 인터페이스를 모두 수정한 뒤, `src/lib/auth.ts`의 jwt/session 콜백에서도 해당 값을 채워야 함

## 의존성

### 외부
- `next-auth` — 확장 대상 타입
- `@prisma/client` — 타입 안전성을 위한 `Role` Enum 임포트

<!-- MANUAL: -->
