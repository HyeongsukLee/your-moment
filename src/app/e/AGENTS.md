<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# e

## 개요
단축 링크 행사 진입점. `/e/[code]`는 행사장에서 공유되는 QR코드에 삽입되는 URL이다. `code`로 행사를 조회한 뒤 사용자를 해당 그룹 가입 흐름으로 리디렉트한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `[code]/page.tsx` | 행사 코드 조회 → `/join/[groupCode]`로 리디렉트 (코드가 유효하지 않으면 오류 표시) |

## AI 에이전트 가이드

- `Event.code`(nanoid 8자)를 `db.event.findUnique({ where: { code } })`로 조회
- 비인증 사용자도 이 라우트에 접근 가능 — 인증은 가입 단계에서 처리
- 행사가 비활성(`isActive: false`)이면 리디렉트 대신 안내 메시지 표시

## 의존성

### 내부
- `src/lib/db.ts` — 코드 기반 행사 조회
- `src/app/join/` — 리디렉트 대상

<!-- MANUAL: -->
