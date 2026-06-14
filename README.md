# 유어모먼트 (Your Moment)

행사 사진에서 내 얼굴을 찾아주는 얼굴인식 서비스.

결혼식, 졸업식, 기업 행사, 러닝 크루 등 대규모 행사에서 찍힌 내 사진을 셀피 한 장으로 빠르게 찾고, 기기에 바로 저장할 수 있습니다.

🌐 **[www.your-moment.site](https://www.your-moment.site)**

---

## 주요 기능

- **셀피 기반 얼굴인식 검색** — 셀피를 업로드하면 AWS Rekognition이 행사 사진에서 내 얼굴을 자동으로 찾아줌
- **기기별 최적화 저장**
  - iPhone / iPad → 공유시트 → "사진에 저장" (카메라 롤 직접 저장)
  - Android → 네이티브 공유시트
  - Mac / Windows → 2장 이상 선택 시 ZIP 압축 다운로드
- **행사(Event) 관리** — 관리자가 행사·그룹을 만들고 사진작가를 배정
- **사진 업로드** — 배정된 사진작가가 행사 사진 업로드, 썸네일 생성 + Rekognition 인덱싱 자동 처리
- **QR코드 / 초대 링크** — 행사별 단축 코드로 참가자 입장
- **역할 기반 접근 제어** — PARTICIPANT / PHOTOGRAPHER / ADMIN 3단계 권한
- **카카오 / 구글 소셜 로그인** — NextAuth.js v5
- **검색 결과 캐싱** — 동일 행사·동일 사용자 재검색 시 DB 캐시 재사용
- **업로드 알림** — 새 사진 업로드 시 행사 참가자에게 알림 발송

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Auth | NextAuth.js v5 beta, Kakao OAuth, Google OAuth |
| Database | PostgreSQL (Supabase), Prisma 6 ORM |
| Storage | AWS S3 (원본 + 썸네일) |
| AI / 얼굴인식 | AWS Rekognition (IndexFaces / SearchFacesByImage) |
| 상태 관리 | Zustand (클라이언트), TanStack Query (서버) |
| Infra | Vercel (서버리스 배포) |

---

## 데이터 모델

```
User          — 참가자 / 사진작가 / 관리자
Group         — 행사 묶음 (시리즈, 시즌 등)
Event         — 행사 (날짜, 대표사진, 담당 사진작가, 그룹)
Photo         — 행사에 속한 사진 (S3 key, 썸네일 key, Rekognition face ID)
Search        — 사용자의 검색 이력
SearchResult  — 검색 결과 (Photo ↔ Search 중간 테이블)
Notification  — 업로드 알림
```

---

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 만들고 아래 값을 채워주세요:

```env
# Database (Supabase)
DATABASE_URL=
DIRECT_URL=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Kakao OAuth
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# Google OAuth (선택)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REKOGNITION_COLLECTION=

# 관리자 지정 (쉼표 구분)
ADMIN_EMAILS=
ADMIN_KAKAO_IDS=

# 테스트 계정 로그인 허용 (운영 환경에서 true 설정 시 활성화)
NEXT_PUBLIC_ENABLE_SIMPLE_LOGIN=false
```

### 3. DB 스키마 적용

```bash
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

---

## 유용한 스크립트

```bash
npm run dev          # 로컬 개발 서버 (포트 3000)
npm run build        # 프로덕션 빌드
npm run db:push      # 스키마 변경 적용
npm run db:seed      # 테스트 데이터 시드
npm run db:studio    # Prisma Studio (DB GUI)
```

---

## 권한 구조

| 역할 | 가능한 작업 |
|------|------------|
| PARTICIPANT | 행사 목록 조회, 셀피로 내 사진 검색·저장 |
| PHOTOGRAPHER | 위 + 배정된 행사에 사진 업로드 |
| ADMIN | 위 + 행사/그룹 생성·관리, 사용자 역할 변경, 모든 사진 관리 |

---

## 주요 경로

```
/                       홈 (행사 목록)
/events/[id]            행사 갤러리 + 셀피 검색
/events/[id]/search     내 사진 검색 결과
/me                     마이페이지 (내 사진 모아보기)
/admin                  관리자 대시보드
/admin/events           행사 관리
/admin/photos/[id]      사진 업로드·관리
/e/[code]               행사 단축 링크 (QR 입장)
/login                  소셜 로그인
```

---

## 배포

Vercel에 연결 후 환경 변수를 설정하면 바로 배포됩니다.

```bash
npx vercel --prod
```

AWS Rekognition Collection은 사전에 생성되어 있어야 합니다:

```bash
aws rekognition create-collection --collection-id <YOUR_COLLECTION_ID>
```
