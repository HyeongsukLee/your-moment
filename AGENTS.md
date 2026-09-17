<!-- Generated: 2026-06-08 -->
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# your-moment

## 개요
행사 사진 얼굴인식 서비스. 참가자가 QR코드/링크로 행사에 참여하고, 셀카를 업로드하면 AWS Rekognition이 행사 사진 중 본인이 찍힌 사진을 자동으로 찾아준다. 사진작가는 사진을 업로드하고, 관리자는 행사·그룹·사용자를 관리한다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `package.json` | 의존성 및 npm 스크립트 (`dev`, `build`, `db:push`, `db:seed`, `db:studio`) |
| `next.config.ts` | Next.js 16 설정 |
| `tsconfig.json` | TypeScript strict 설정 |
| `vercel.json` | Vercel 배포 설정 |
| `.env.local` | 필수 환경변수 (커밋 금지) |
| `prisma/schema.prisma` | DB 스키마: User, Group, Event, Photo, Search, SearchResult, Notification |

### 필수 환경변수
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL (Supabase 풀러 + 다이렉트)
- `NEXTAUTH_SECRET`
- `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` — 카카오 OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — 구글 OAuth (선택)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`
- `AWS_S3_BUCKET` — 사진 저장 버킷
- `AWS_REKOGNITION_COLLECTION` — 얼굴 컬렉션 ID
- `ADMIN_EMAILS` / `ADMIN_KAKAO_IDS` — 쉼표 구분 관리자 지정
- `ENABLE_SIMPLE_LOGIN` — `"true"` 설정 시 운영에서도 테스트 계정 로그인 허용 (서버 전용, 클라이언트 번들 미노출)

## 하위 디렉토리

| 디렉토리 | 역할 |
|----------|------|
| `src/` | 전체 애플리케이션 소스 코드 (`src/AGENTS.md` 참고) |
| `prisma/` | DB 스키마 및 시드 데이터 (`prisma/AGENTS.md` 참고) |
| `scripts/` | 일회성 CLI 스크립트 (`scripts/AGENTS.md` 참고) |
| `public/` | `/`로 서빙되는 정적 에셋 |

## AI 에이전트 가이드

### 기술 스택
- **Next.js 16** App Router (Pages Router 아님) — 라우팅 수정 전 반드시 `node_modules/next/dist/docs/` 확인
- **React 19**, **TypeScript 5**, **Tailwind CSS 4**
- **Prisma 6** ORM → PostgreSQL; `src/lib/db.ts` 싱글톤 사용, 절대로 `new PrismaClient()` 직접 생성 금지
- **next-auth v5 beta** — `next-auth/next`가 아닌 `next-auth`에서 임포트
- **AWS SDK v3** — 모듈형 임포트 (`@aws-sdk/client-s3`, `@aws-sdk/client-rekognition`)
- **Zustand** 클라이언트 상태, **TanStack Query** 서버 상태

### 인증·권한 패턴
모든 보호된 API 라우트는 `src/lib/auth.ts`의 `auth()`를 호출하고 `session.user.role`을 확인한다:
- `PARTICIPANT` — 기본값; 본인 얼굴 사진만 검색 가능
- `PHOTOGRAPHER` — 배정된 행사에 사진 업로드 가능
- `ADMIN` — 전체 접근; `src/lib/admin.ts`의 가드 함수 사용

### 실행 / 개발
```bash
npm run dev          # 로컬 개발 서버 (포트 3000)
npm run db:push      # 스키마 변경 적용 (.env.local 사용)
npm run db:seed      # 테스트 데이터 시드
npm run build        # prisma generate + next build
```

## 의존성

### 외부 패키지
- `next` 16.2.7, `react` 19, `next-auth` v5-beta
- `@prisma/client` 6, `prisma` 6
- `@aws-sdk/client-s3`, `@aws-sdk/client-rekognition`, `@aws-sdk/s3-request-presigner`
- `@tanstack/react-query` 5, `zustand` 5
- `nanoid` 5 (단축 코드 생성), `qrcode.react` 4

<!-- MANUAL: -->
