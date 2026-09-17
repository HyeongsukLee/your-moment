<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# components

## 개요
여러 페이지에서 공유하는 React 클라이언트 컴포넌트. 모두 `"use client"` 선언이 있다. 서버 전용 UI는 페이지 파일에 둔다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `CoverEditor.tsx` | 관리자용 행사 커버 사진 위치 드래그 편집기 |
| `MomentBrowser.tsx` | 행사 사진 그리드/뷰어 — 무한 스크롤 및 지연 로딩 포함 |
| `NotificationBell.tsx` | 알림 아이콘 (미읽음 뱃지 포함); `/api/notifications` 주기적 폴링 |
| `PhotoModal.tsx` | 원본 사진 라이트박스 모달 (다운로드 액션 포함) |
| `RunningCat.tsx` | 로딩 애니메이션 — SVG 고양이; 애니메이션 클래스는 `globals.css`의 `ym-*` |
| `Toast.tsx` | 일시적 토스트 알림 컴포넌트 (Zustand 스토어와 함께 사용) |

## AI 에이전트 가이드

### 새 컴포넌트 추가 시
- 파일 최상단에 반드시 `"use client"` 추가
- Props 인터페이스는 컴포넌트 함수 위에 선언
- Tailwind 4 유틸리티 클래스 사용; 인라인 스타일 지양
- default export로 내보내기; 현재 barrel `index.ts`는 없음

### 기존 패턴
- `NotificationBell`은 TanStack Query 대신 `useCallback`/`useEffect` 폴링 사용 (SSR 충돌 방지용, 의도적)
- `MomentBrowser`는 `useRef` + Intersection Observer로 무한 스크롤 구현
- `RunningCat` 애니메이션 CSS는 `src/app/globals.css`의 `ym-*` 클래스에 있음

## 의존성

### 내부
- `src/app/globals.css` — `RunningCat`에서 사용하는 `ym-*` 애니메이션 클래스

### 외부
- `next/image` — `MomentBrowser`의 최적화 이미지 렌더링
- `next/navigation` — `NotificationBell`, `MomentBrowser`의 라우터 이동

<!-- MANUAL: -->
