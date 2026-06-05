import { PrismaClient, type Role } from "@prisma/client";

const db = new PrismaClient();

// 테스트 계정 (간편 로그인 picker에서 선택)
const TEST_USERS: { email: string; name: string; role: Role }[] = [
  { email: "dev@yourmoment.local", name: "운영 테스터", role: "ADMIN" },
  { email: "photographer1@yourmoment.local", name: "김작가", role: "PHOTOGRAPHER" },
  { email: "photographer2@yourmoment.local", name: "이작가", role: "PHOTOGRAPHER" },
  { email: "photographer3@yourmoment.local", name: "박작가", role: "PHOTOGRAPHER" },
  { email: "participant1@yourmoment.local", name: "최참가", role: "PARTICIPANT" },
  { email: "participant2@yourmoment.local", name: "정참가", role: "PARTICIPANT" },
  { email: "participant3@yourmoment.local", name: "한참가", role: "PARTICIPANT" },
];

// "오늘의 순간" 5개 — ownerIdx로 작가 배정 (TEST_USERS 작가 인덱스 1~3)
const MOMENTS = [
  { name: "2026 성남 마라톤", description: "성남시 주최 봄 마라톤 대회", date: "2026-05-20", ownerIdx: 1 },
  { name: "한강 러닝크루 나이트런", description: "여의도 한강공원 야간 러닝", date: "2026-05-28", ownerIdx: 1 },
  { name: "북한산 트레일 러닝", description: "북한산 둘레길 트레일 대회", date: "2026-06-02", ownerIdx: 2 },
  { name: "잠실 미라클 모닝런", description: "잠실 종합운동장 새벽 러닝", date: "2026-06-04", ownerIdx: 2 },
  { name: "올림픽공원 컬러런", description: "올림픽공원 색채 축제 러닝", date: "2026-06-10", ownerIdx: 3 },
];

async function main() {
  // 테스트 유저 upsert (역할 보장)
  const users: Record<string, string> = {}; // email → id
  for (const u of TEST_USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role },
      select: { id: true },
    });
    users[u.email] = user.id;
    console.log(`👤 ${u.name} (${u.role})`);
  }

  // 행사/사진 초기화 (반복 실행 안전)
  await db.searchResult.deleteMany();
  await db.search.deleteMany();
  await db.photo.deleteMany();
  await db.event.deleteMany();

  const adminId = users["dev@yourmoment.local"];

  for (let e = 0; e < MOMENTS.length; e++) {
    const m = MOMENTS[e];
    const photographerEmail = TEST_USERS[m.ownerIdx].email;
    await db.event.create({
      data: {
        name: m.name,
        description: m.description,
        date: new Date(m.date),
        isActive: true,
        ownerId: adminId, // 행사 생성은 관리자
        photographers: { connect: { id: users[photographerEmail] } }, // 담당 작가 배정
        photos: {
          create: Array.from({ length: 12 }).map((_, i) => ({
            s3Key: `events/demo-${e}/originals/photo-${i + 1}.jpg`,
            thumbnailKey: `https://picsum.photos/seed/ym-${e}-${i + 1}/400/400`,
          })),
        },
      },
    });
    console.log(`✅ "${m.name}" (${m.date}) → 작가: ${TEST_USERS[m.ownerIdx].name}`);
  }

  console.log(
    `\n🌱 유저 ${TEST_USERS.length}명 + 순간 ${MOMENTS.length}개(각 12장) 시드 완료`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
