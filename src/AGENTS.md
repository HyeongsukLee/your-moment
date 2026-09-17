<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# src

## 개요
전체 애플리케이션 소스 코드. Next.js App Router 구조에 따라 `app/`(페이지·API 라우트), `components/`(공유 컴포넌트), `lib/`(서버 유틸리티), `types/`(타입 선언)으로 구성된다.

## 하위 디렉토리

| 디렉토리 | 역할 |
|----------|------|
| `app/` | Next.js App Router — 페이지, 레이아웃, API 라우트 (`app/AGENTS.md` 참고) |
| `components/` | 공유 React 클라이언트 컴포넌트 (`components/AGENTS.md` 참고) |
| `lib/` | 서버 사이드 유틸리티 모듈: DB, 인증, AWS 등 (`lib/AGENTS.md` 참고) |
| `types/` | TypeScript 선언 파일 (`types/AGENTS.md` 참고) |

## AI 에이전트 가이드

- 모든 임포트는 `tsconfig.json`에 설정된 `@/` 별칭 사용 (`src/` 를 가리킴)
- `app/` 내 컴포넌트는 기본적으로 서버 컴포넌트; 인터랙션이 필요한 경우에만 `"use client"` 추가
- `PrismaClient`를 직접 생성하지 말 것 — 반드시 `lib/db.ts` 싱글톤 사용
- 인증 확인은 API 라우트나 서버 컴포넌트에서 수행; 클라이언트 컴포넌트에서 하지 말 것

<!-- MANUAL: -->
