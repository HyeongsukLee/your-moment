<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# scripts

## 개요
일반 앱 흐름 밖에서 실행하는 일회성 CLI 스크립트 모음.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `seed-groups.ts` | 로컬/스테이징 환경용 참여 코드가 있는 Group 레코드 시드 |

## AI 에이전트 가이드

- `tsx`로 직접 실행: `npx tsx scripts/<파일명>.ts`
- DB 접근은 반드시 `src/lib/db.ts` 사용, 직접 `PrismaClient` 생성 금지
- 스크립트는 멱등성(재실행해도 안전)을 유지해야 함
- `.env.local` 필요 — 필요 시 `dotenv -e .env.local --` 접두어 사용

<!-- MANUAL: -->
