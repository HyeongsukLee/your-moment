# 유어모먼트 (Your Moment)

행사 사진에서 내 얼굴을 찾아주는 얼굴인식 서비스.

결혼식, 졸업식, 기업 행사 등 대규모 행사에서 찍힌 내 사진을 셀피 한 장으로 빠르게 찾아 다운로드할 수 있습니다.

---

## 주요 기능

- **셀피 기반 얼굴인식 검색** — 셀피를 업로드하면 AWS Rekognition이 행사 사진에서 내 얼굴을 찾아줌
- **행사(Event) 관리** — 관리자가 행사를 만들고 사진작가를 배정
- **사진 업로드** — 배정된 사진작가가 행사 사진을 S3에 업로드, Rekognition 인덱싱 자동 처리
- **역할 기반 접근 제어** — PARTICIPANT / PHOTOGRAPHER / ADMIN 3단계 권한
- **카카오 소셜 로그인** — NextAuth.js + KakaoProvider
- **검색 결과 캐싱** — 동일 행사·동일 사용자의 검색은 DB에 캐시하여 재사용
- **사진 다운로드** — 원본 S3 이미지 직접 다운로드 (presigned URL)
- **토스트 피드백** — 업로드·다운로드·에러 등 주요 액션에 토스트 알림

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15 (App Router), Tailwind CSS |
| Auth | NextAuth.js v5, Kakao OAuth |
| Database | PostgreSQL (Supabase), Prisma ORM |
| Storage | AWS S3 |
| AI / 얼굴인식 | AWS Rekognition (IndexFaces / SearchFacesByImage) |
| Infra | Vercel (서버리스 배포) |

---

## 데이터 모델

```
User        — 참가자 / 사진작가 / 관리자
Event       — 행사 (날짜, 썸네일, 대표 사진, 담당 사진작가)
Photo       — 행사에 속한 사진 (S3 key, 썸네일, Rekognition ID)
Search      — 사용자의 검색 이력
SearchResult — 검색 결과 (Photo와 Search의 중간 테이블)
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

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_REKOGNITION_COLLECTION_ID=
```

### 3. DB 마이그레이션

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

---

## 권한 구조

| 역할 | 가능한 작업 |
|------|------------|
| PARTICIPANT | 행사 목록 조회, 셀피로 내 사진 검색·다운로드 |
| PHOTOGRAPHER | 위 + 배정된 행사에 사진 업로드 |
| ADMIN | 위 + 행사 생성/관리, 사용자 역할 변경, 모든 사진 관리 |

---

## 주요 경로

```
/                   홈 (행사 캘린더)
/events/[id]        행사 상세 + 셀피 검색
/me                 내 정보 + 검색 이력
/admin              관리자 대시보드 (행사·사용자·사진 관리)
/login              카카오 로그인
```

---

## 배포

Vercel에 연결 후 환경 변수를 설정하면 바로 배포됩니다.

```bash
vercel --prod
```

AWS Rekognition Collection은 사전에 생성되어 있어야 합니다:

```bash
aws rekognition create-collection --collection-id <YOUR_COLLECTION_ID>
```
