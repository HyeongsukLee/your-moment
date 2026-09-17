<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-08 -->

# api/notifications

## 개요
인앱 알림 목록 조회 및 읽음 처리 엔드포인트. 알림은 서버 사이드에서 생성(예: 사진 업로드 후)되며, `NotificationBell` 컴포넌트가 주기적으로 폴링한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `route.ts` | GET — 현재 사용자의 읽지 않은 알림 목록 반환 (`createdAt` 내림차순) |
| `read/route.ts` | POST — 현재 사용자의 특정 알림 또는 전체 알림을 읽음 처리 |

## AI 에이전트 가이드

### 알림 타입

| 타입 | 트리거 |
|------|--------|
| `PHOTOS_UPLOADED` | 관리자가 `notify-upload` 라우트로 일괄 업로드 후 발송 |
| `PHOTOS_OF_ME` | 새 사진이 기존 검색 결과와 매칭될 때 생성 |
| `ROLE_CHANGED` | 관리자가 사용자 역할을 변경할 때 생성 |
| `NEW_EVENT` | 사용자의 그룹에 새 행사가 추가될 때 생성 |

- `NotificationBell`은 `setInterval`로 30초마다 이 엔드포인트를 폴링
- `notification.eventId`는 탭 시 관련 행사로 이동하는 데 사용

## 의존성

### 내부
- `src/lib/auth.ts` — `auth()`
- `src/lib/db.ts` — Notification 모델 쿼리

<!-- MANUAL: -->
